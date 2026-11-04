import { describe, expect, it } from '@jest/globals';

import { aplicarVenda } from '../leilao';
import type { Jogador, Partida } from '../partida';
import { escolherPersonagem, iniciarRepescagem, jogadorDaVez, passarVez } from '../repescagem';

function jogador(id: number, saldo: number, time: string[]): Jogador {
  return { id, nome: `J${id}`, saldo, time };
}

function partida(jogadores: Jogador[], repescagem: string[]): Partida {
  return {
    jogadores,
    fila: [],
    indiceAtual: 0,
    repescagem,
    vendas: [],
    pendente: null,
    distribuicao: null,
    batalha: null,
  };
}

// Devolve os valores em sequência; cada valor v (0 a 1) vira o dado floor(v × 6) + 1.
function sequencia(...valores: number[]) {
  let i = 0;
  return () => valores[i++ % valores.length];
}

// Aplica a venda pendente, como o botão Confirmar do registro.
function confirmar(p: Partida) {
  return aplicarVenda(p, p.pendente!);
}

describe('ordem da repescagem', () => {
  it('só entra quem tem vaga, de quem tem mais dinheiro para quem tem menos', () => {
    const p = iniciarRepescagem(
      partida([jogador(1, 5, ['a', 'b']), jogador(2, 9, ['c', 'd']), jogador(3, 7, ['e', 'f', 'g'])], ['x', 'y']),
    );
    expect(p.distribuicao?.ordem).toEqual([2, 1]);
    expect(p.distribuicao?.dados).toBeNull();
  });

  it('no empate de dinheiro, o MAIOR dado escolhe primeiro', () => {
    const p = iniciarRepescagem(
      partida([jogador(1, 5, ['a', 'b']), jogador(2, 5, ['c', 'd'])], ['x', 'y']),
      sequencia(0.1, 0.9), // J1 tira 1, J2 tira 6
    );
    expect(p.distribuicao?.ordem).toEqual([2, 1]);
    expect(p.distribuicao?.dados).toEqual({ 1: [1], 2: [6] });
  });

  it('rola de novo se o dado também empatar', () => {
    const p = iniciarRepescagem(
      partida([jogador(1, 5, ['a', 'b']), jogador(2, 5, ['c', 'd'])], ['x', 'y']),
      sequencia(0.5, 0.5, 0.9, 0.1), // empate em 4; depois J1 tira 6 e J2 tira 1
    );
    expect(p.distribuicao?.ordem).toEqual([1, 2]);
  });
});

describe('escolha', () => {
  it('escolher cria a venda de R$ 1 sem mexer no time antes do registro', () => {
    const p = escolherPersonagem(iniciarRepescagem(partida([jogador(1, 5, ['a', 'b'])], ['x'])), 'x');
    expect(p.pendente).toMatchObject({ codigo: 'x', jogadorId: 1, valor: 1, tipo: 'escolhaRepescagem' });
    expect(p.jogadores[0].time).toHaveLength(2);
    expect(p.repescagem).toEqual(['x']);
  });

  it('é grátis com saldo zero', () => {
    const p = escolherPersonagem(iniciarRepescagem(partida([jogador(1, 0, ['a', 'b'])], ['x'])), 'x');
    expect(p.pendente?.valor).toBe(0);
  });

  it('registrar completa o time, desconta e tira da repescagem', () => {
    const p = confirmar(escolherPersonagem(iniciarRepescagem(partida([jogador(1, 5, ['a', 'b'])], ['x'])), 'x'));
    expect(p.jogadores[0]).toMatchObject({ saldo: 4, time: ['a', 'b', 'x'] });
    expect(p.repescagem).toEqual([]);
    expect(p.pendente).toBeNull();
    expect(p.indiceAtual).toBe(0);
  });

  it('não aceita personagem que não está na repescagem', () => {
    const inicial = iniciarRepescagem(partida([jogador(1, 5, ['a', 'b'])], ['x']));
    expect(escolherPersonagem(inicial, 'z').pendente).toBeNull();
  });

  it('a vez passa adiante e pula quem completou o time', () => {
    let p = iniciarRepescagem(partida([jogador(1, 9, ['a', 'b']), jogador(2, 5, ['c'])], ['x', 'y', 'z']));
    expect(jogadorDaVez(p)?.id).toBe(1);
    p = confirmar(escolherPersonagem(p, 'x'));
    expect(jogadorDaVez(p)?.id).toBe(2);
    p = confirmar(escolherPersonagem(p, 'y'));
    expect(jogadorDaVez(p)?.id).toBe(2);
    p = confirmar(escolherPersonagem(p, 'z'));
    expect(p.jogadores.map((j) => j.time.length)).toEqual([3, 3]);
    expect(p.repescagem).toEqual([]);
    expect(jogadorDaVez(p)).toBeNull();
  });
});

describe('quando ninguém quer', () => {
  it('passar leva a vez ao próximo', () => {
    const p = passarVez(iniciarRepescagem(partida([jogador(1, 9, ['a', 'b']), jogador(2, 5, ['c', 'd'])], ['x', 'y'])));
    expect(jogadorDaVez(p)?.id).toBe(2);
    expect(p.pendente).toBeNull();
  });

  it('se todos passam, o personagem fica com quem tem menos dinheiro', () => {
    let p = iniciarRepescagem(partida([jogador(1, 9, ['a', 'b']), jogador(2, 5, ['c', 'd'])], ['x', 'y']));
    p = passarVez(passarVez(p));
    expect(p.pendente).toMatchObject({ codigo: 'x', jogadorId: 2, valor: 1, tipo: 'sobraRepescagem' });
    p = confirmar(p);
    expect(p.jogadores[1]).toMatchObject({ saldo: 4, time: ['c', 'd', 'x'] });
    expect(p.repescagem).toEqual(['y']);
  });

  it('no empate de quem tem menos, o MENOR dado fica com ele', () => {
    let p = iniciarRepescagem(
      partida([jogador(1, 5, ['a', 'b']), jogador(2, 5, ['c', 'd'])], ['x', 'y']),
      sequencia(0.9, 0.1),
    );
    p = passarVez(passarVez(p, sequencia(0.9, 0.1)), sequencia(0.9, 0.1));
    expect(p.pendente?.jogadorId).toBe(2);
    expect(p.pendente?.dados).toEqual({ 1: [6], 2: [1] });
  });

  it('sempre termina com todos os times completos', () => {
    let p = iniciarRepescagem(
      partida([jogador(1, 3, ['a']), jogador(2, 0, ['b', 'c']), jogador(3, 7, ['d', 'e'])], ['x', 'y', 'z', 'w']),
    );
    for (let i = 0; i < 30 && p.repescagem.length > 0; i++) {
      p = i % 2 === 0 ? escolherPersonagem(p, p.repescagem[0]) : passarVez(p);
      if (p.pendente) p = confirmar(p);
    }
    expect(p.repescagem).toEqual([]);
    expect(p.jogadores.map((j) => j.time.length)).toEqual([3, 3, 3]);
  });
});
