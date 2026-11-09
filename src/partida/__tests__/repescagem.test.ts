import { describe, expect, it } from '@jest/globals';

import { criarAleatorio } from '@/batalha/motor';

import { aplicarVenda } from '../leilao';
import type { Jogador, Partida } from '../partida';
import {
  candidatosSobra,
  cartaDaVez,
  semLanceNaRepescagem,
  sortearRepescagem,
  venderNaRepescagem,
} from '../repescagem';

function jogador(id: number, saldo: number, time: string[]): Jogador {
  return { id, nome: `J${id}`, saldo, time };
}

function partida(jogadores: Jogador[], repescagem: string[]): Partida {
  return { jogadores, indiceAtual: 9, repescagem, vendas: [], repescagemSorteada: false, batalha: null };
}

describe('ordem da repescagem', () => {
  it('sorteia a ordem sem perder nem repetir personagem', () => {
    const p = sortearRepescagem(partida([jogador(1, 5, [])], ['x', 'y', 'z']), criarAleatorio(3));
    expect(p.repescagemSorteada).toBe(true);
    expect([...p.repescagem].sort()).toEqual(['x', 'y', 'z']);
  });

  it('muda a ordem conforme o sorteio', () => {
    const ordens = new Set<string>();
    for (let semente = 1; semente <= 30; semente++) {
      ordens.add(sortearRepescagem(partida([], ['x', 'y', 'z']), criarAleatorio(semente)).repescagem.join(''));
    }
    expect(ordens.size).toBeGreaterThan(3);
  });

  it('o personagem da vez é o primeiro da lista', () => {
    expect(cartaDaVez(partida([], ['y', 'x']))).toBe('y');
    expect(cartaDaVez(partida([], []))).toBeNull();
  });
});

describe('lance na repescagem', () => {
  it('registrar põe no time, desconta o lance e tira da repescagem', () => {
    const p = aplicarVenda(
      partida([jogador(1, 9, ['a', 'b']), jogador(2, 5, ['c'])], ['x', 'y']),
      venderNaRepescagem('x', 2, 3),
    );
    expect(p.jogadores[1]).toMatchObject({ saldo: 2, time: ['c', 'x'] });
    expect(p.repescagem).toEqual(['y']);
    expect(p.indiceAtual).toBe(9);
  });
});

describe('sem lance na repescagem', () => {
  it('fica com quem tem menos dinheiro entre quem tem vaga, por R$ 1', () => {
    const p = partida([jogador(1, 2, ['a', 'b', 'c']), jogador(2, 9, ['d']), jogador(3, 5, ['e'])], ['x']);
    expect(candidatosSobra(p)).toEqual([3]);
    expect(semLanceNaRepescagem(p, 'x')).toEqual({
      tipo: 'venda',
      venda: { codigo: 'x', jogadorId: 3, valor: 1, tipo: 'sobraRepescagem' },
    });
  });

  it('é grátis com saldo zero', () => {
    const p = partida([jogador(1, 0, ['a']), jogador(2, 4, ['b'])], ['x']);
    expect(semLanceNaRepescagem(p, 'x')).toMatchObject({ tipo: 'venda', venda: { jogadorId: 1, valor: 0 } });
  });

  it('no empate de dinheiro, manda para a roleta só os empatados', () => {
    const p = partida([jogador(1, 4, ['a']), jogador(2, 4, ['b']), jogador(3, 9, ['c'])], ['x']);
    expect(semLanceNaRepescagem(p, 'x')).toEqual({ tipo: 'roleta', candidatos: [1, 2] });
  });
});
