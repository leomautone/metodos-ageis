import { describe, expect, it } from '@jest/globals';

import {
  aplicarVenda,
  cartaSemLance,
  conferirCarta,
  leilaoConcluido,
  podeComprar,
  totalLeiloes,
  venderCarta,
} from '../leilao';
import { criarPartida, type Jogador, type Partida } from '../partida';

function comTimes(times: string[][], saldos?: number[], repescagem: string[] = []): Partida {
  const p = criarPartida(times.map((_, i) => `J${i + 1}`));
  const jogadores: Jogador[] = p.jogadores.map((j, i) => ({ ...j, time: times[i], saldo: saldos?.[i] ?? j.saldo }));
  return { ...p, jogadores, repescagem };
}

// Cada valor v (0 a 1) vira o dado floor(v × 6) + 1.
function sequencia(...valores: number[]) {
  let i = 0;
  return () => valores[i++ % valores.length];
}

describe('rodadas do leilão', () => {
  it('são jogadores × 3, sem sorteio de cartas', () => {
    const p = criarPartida(['Leo', 'PH', 'João', 'Flores']);
    expect(totalLeiloes(p)).toBe(12);
    expect(leilaoConcluido(p)).toBe(false);
    expect(leilaoConcluido({ ...p, indiceAtual: 12 })).toBe(true);
  });
});

describe('carta lida no QR', () => {
  it('aceita carta existente e sem dono', () => {
    expect(conferirCarta(comTimes([[], []]), 'ANI-011')).toBeNull();
  });

  it('recusa código que não existe', () => {
    expect(conferirCarta(comTimes([[], []]), 'ANI-999')).toContain('não é uma carta');
  });

  it('recusa carta que já está num time ou na repescagem', () => {
    const p = comTimes([['ANI-011'], []], undefined, ['ANI-005']);
    expect(conferirCarta(p, 'ANI-011')).toContain('time de J1');
    expect(conferirCarta(p, 'ANI-005')).toContain('repescagem');
  });
});

describe('venda na mesa', () => {
  it('não deixa pagar mais que o saldo nem comprar com o time completo', () => {
    const [j1, j2] = comTimes([[], ['a', 'b', 'c']], [5, 20]).jogadores;
    expect(podeComprar(j1, 5)).toBe(true);
    expect(podeComprar(j1, 6)).toBe(false);
    expect(podeComprar(j1, -1)).toBe(false);
    expect(podeComprar(j2, 0)).toBe(false);
  });

  it('registrar põe no time, desconta e passa para o próximo leilão', () => {
    const p = aplicarVenda(comTimes([[], []]), venderCarta('ANI-011', 2, 4));
    expect(p.jogadores[1]).toMatchObject({ saldo: 16, time: ['ANI-011'] });
    expect(p.indiceAtual).toBe(1);
  });
});

describe('sem lance', () => {
  it('vai para a repescagem enquanto ela tem menos de 3', () => {
    const p = comTimes([[], []], undefined, ['ANI-001', 'ANI-002']);
    const venda = cartaSemLance(p, 'ANI-011');
    expect(venda).toMatchObject({ jogadorId: null, tipo: 'repescagem' });
    const depois = aplicarVenda(p, venda);
    expect(depois.repescagem).toEqual(['ANI-001', 'ANI-002', 'ANI-011']);
    expect(depois.indiceAtual).toBe(1);
  });

  it('com a repescagem cheia, vai para quem tem mais vagas por R$ 1', () => {
    const p = comTimes([['a', 'b'], ['c']], undefined, ['x', 'y', 'z']);
    expect(cartaSemLance(p, 'ANI-011')).toMatchObject({ jogadorId: 2, valor: 1, tipo: 'obrigatorio' });
  });

  it('no empate de vagas, o menor dado fica com ele; grátis com saldo zero', () => {
    const p = comTimes([['a'], ['b']], [0, 0], ['x', 'y', 'z']);
    const venda = cartaSemLance(p, 'ANI-011', sequencia(0.9, 0.1));
    expect(venda).toMatchObject({ jogadorId: 2, valor: 0, dados: { 1: [6], 2: [1] } });
  });
});
