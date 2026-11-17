import { describe, expect, it } from '@jest/globals';

import { calcularChances, criarAleatorio, simularBatalha } from '@/batalha/motor';
import { narrarRound } from '@/batalha/narracao';
import { ITENS_SORTE } from '@/data/sorte';

import { criarPartida, type Partida } from '../partida';
import { fatiaNoPonteiroPorPeso, fatiasPorPeso, sortearGiroPorPeso } from '../roleta';
import {
  aplicarGiro,
  escolherTerreno,
  girosDisponiveis,
  itensDoJogador,
  podeGirar,
  terrenoPendente,
  timeDaBatalha,
} from '../sorte';

function comSaldos(saldos: number[], times?: string[][]): Partida {
  const p = criarPartida(saldos.map((_, i) => `J${i + 1}`));
  return {
    ...p,
    jogadores: p.jogadores.map((j, i) => ({ ...j, saldo: saldos[i], time: times?.[i] ?? ['ANI-011'] })),
  };
}

describe('itens da roleta', () => {
  it('as chances somam 100%', () => {
    expect(ITENS_SORTE.reduce((s, i) => s + i.peso, 0)).toBeCloseTo(100);
  });
});

describe('giros da roleta da sorte', () => {
  it('cada R$ 5 que sobrou vale um giro', () => {
    const p = comSaldos([4, 5, 14]);
    expect(p.jogadores.map((j) => girosDisponiveis(p, j))).toEqual([0, 1, 2]);
  });

  it('a roleta só aparece se alguém pode girar e antes da batalha', () => {
    expect(podeGirar(comSaldos([4, 3]))).toBe(false);
    expect(podeGirar(comSaldos([4, 5]))).toBe(true);
  });

  it('girar desconta R$ 5 e guarda o item; sem giro, nada muda', () => {
    let p = comSaldos([10, 2]);
    p = aplicarGiro(p, 1, 'bencao-ancestrais');
    expect(p.jogadores[0].saldo).toBe(5);
    expect(itensDoJogador(p, 1).map((i) => i.id)).toEqual(['bencao-ancestrais']);
    expect(aplicarGiro(p, 2, 'bencao-ancestrais')).toBe(p);
    expect(aplicarGiro(p, 1, 'item-que-nao-existe')).toBe(p);
  });

  it('Giros Extras dá dois giros de graça, sem descontar dinheiro', () => {
    let p = comSaldos([5]);
    p = aplicarGiro(p, 1, 'giros-extras');
    expect(p.jogadores[0].saldo).toBe(0);
    expect(girosDisponiveis(p, p.jogadores[0])).toBe(2);
    p = aplicarGiro(p, 1, 'perdeu-a-vez');
    p = aplicarGiro(p, 1, 'perdeu-a-vez');
    expect(p.jogadores[0].saldo).toBe(0);
    expect(girosDisponiveis(p, p.jogadores[0])).toBe(0);
  });

  it('Troca do Destino troca um animal de cada lado', () => {
    let p = comSaldos([5, 0], [['ANI-011', 'ANI-005'], ['ANI-008']]);
    p = aplicarGiro(p, 1, 'troca-do-destino', criarAleatorio(3));
    expect(p.jogadores[1].time).toHaveLength(1);
    expect(p.jogadores[0].time).toContain('ANI-008');
    expect([...p.jogadores[0].time, ...p.jogadores[1].time].sort()).toEqual(['ANI-005', 'ANI-008', 'ANI-011']);
  });

  it('Senhor da Arena espera a escolha do terreno', () => {
    let p = comSaldos([5]);
    p = aplicarGiro(p, 1, 'senhor-da-arena');
    expect(terrenoPendente(p, 1)).toBe(0);
    p = escolherTerreno(p, 1, 0, 'agua');
    expect(terrenoPendente(p, 1)).toBe(-1);
    expect(timeDaBatalha(p, p.jogadores[0]).terrenos).toEqual(['agua']);
  });
});

describe('efeitos na batalha', () => {
  it('Poder do time, atributos e o mais fraco/mais forte', () => {
    // Leão 6,7 · Tigre 7,2 · Falcão 5,4
    let p = comSaldos([30], [['ANI-011', 'ANI-005', 'ANI-027']]);
    p = aplicarGiro(p, 1, 'bencao-ancestrais'); // +1 no time
    p = aplicarGiro(p, 1, 'maldicao-pantano'); // −0,5 no time
    p = aplicarGiro(p, 1, 'couro-de-pedra'); // +1 durabilidade ≈ +0,175
    p = aplicarGiro(p, 1, 'forca-ao-fraco'); // +1 no Falcão
    p = aplicarGiro(p, 1, 'queda-do-forte'); // −1 no Tigre
    const t = timeDaBatalha(p, p.jogadores[0]);
    expect(t.bonus).toBeCloseTo(0.675);
    expect(t.ajustes).toEqual({ 'ANI-027': 1, 'ANI-005': -1 });
  });

  it('o bônus muda as chances na batalha', () => {
    const times = [
      { jogadorId: 1, codigos: ['ANI-011', 'ANI-005'] },
      { jogadorId: 2, codigos: ['ANI-008', 'ANI-009'] },
    ];
    const sem = calcularChances(times, 400);
    const com = calcularChances([{ ...times[0], bonus: 2 }, times[1]], 400);
    expect(com[1]).toBeGreaterThan(sem[1]);
  });

  it('Baixa Antes da Luta derruba um animal no começo (nunca o último)', () => {
    const r = simularBatalha(
      [
        { jogadorId: 1, codigos: ['ANI-011', 'ANI-005'], baixas: 5 },
        { jogadorId: 2, codigos: ['ANI-008', 'ANI-009'] },
      ],
      criarAleatorio(1),
    );
    const baixas = r.eventos.filter((e) => e.tipo === 'baixa');
    expect(baixas).toHaveLength(1);
    expect(r.eventos[0].tipo).toBe('baixa');
    expect(narrarRound(r.eventos, 1, () => 'J1').some((b) => b.fora && b.texto.includes('J1'))).toBe(true);
  });

  it('Vida Extra salva o último animal de uma derrota', () => {
    let salvou = 0;
    for (let s = 0; s < 40; s++) {
      const r = simularBatalha(
        [
          { jogadorId: 1, codigos: ['ANI-027'], vidasExtras: 1 },
          { jogadorId: 2, codigos: ['ANI-001'] },
        ],
        criarAleatorio(s),
      );
      const vida = r.eventos.filter((e) => e.tipo === 'vida_extra');
      expect(vida.length).toBeLessThanOrEqual(1);
      if (vida.length === 1) {
        salvou += 1;
        expect(vida[0].salvo).toBe('ANI-027');
        // Depois de salvo, ele ainda aparece lutando.
        const depois = r.eventos.slice(r.eventos.indexOf(vida[0]) + 1);
        expect(depois.some((e) => e.atacante === 'ANI-027' || e.alvo === 'ANI-027')).toBe(true);
      }
    }
    expect(salvou).toBeGreaterThan(0);
  });

  it('Senhor da Arena decide a condição do duelo final', () => {
    for (let s = 0; s < 10; s++) {
      const r = simularBatalha(
        [
          { jogadorId: 1, codigos: ['ANI-027'], terrenos: ['agua'] },
          { jogadorId: 2, codigos: ['ANI-029'] },
        ],
        criarAleatorio(s),
      );
      const condicao = r.eventos.find((e) => e.tipo === 'condicao_final');
      if (condicao) {
        expect(condicao.zona).toBe('agua');
        expect(condicao.time).toBe(1);
      }
    }
  });
});

describe('narração padrão', () => {
  it('muda de uma batalha para outra e não repete a abertura em todo Round 1', () => {
    const times = [
      { jogadorId: 1, codigos: ['ANI-011', 'ANI-027', 'ANI-017'] },
      { jogadorId: 2, codigos: ['ANI-013', 'ANI-022', 'ANI-014'] },
      { jogadorId: 3, codigos: ['ANI-019', 'ANI-010', 'ANI-016'] },
    ];
    const aberturas = new Set<string>();
    for (let s = 0; s < 20; s++) {
      const r = simularBatalha(times, criarAleatorio(s));
      aberturas.add(narrarRound(r.eventos, 1, () => 'J')[0].texto);
    }
    expect(aberturas.size).toBeGreaterThan(4);
  });

  it('não repete a mesma frase dentro de um round', () => {
    const r = simularBatalha(
      [
        { jogadorId: 1, codigos: ['ANI-011', 'ANI-027', 'ANI-017'] },
        { jogadorId: 2, codigos: ['ANI-013', 'ANI-022', 'ANI-014'] },
      ],
      criarAleatorio(7),
    );
    const blocos = narrarRound(r.eventos, 1, () => 'J').map((b) => b.texto);
    expect(new Set(blocos).size).toBe(blocos.length);
  });
});

describe('roleta com pesos', () => {
  it('as fatias ocupam a volta inteira, na proporção dos pesos', () => {
    const f = fatiasPorPeso([1, 3]);
    expect(f[0]).toEqual({ inicio: 0, fim: 90 });
    expect(f[1]).toEqual({ inicio: 90, fim: 360 });
  });

  it('a roda sempre para em cima da fatia sorteada', () => {
    const pesos = ITENS_SORTE.map((i) => i.peso);
    const aleatorio = criarAleatorio(5);
    let rotacao = 0;
    for (let i = 0; i < 200; i++) {
      const r = sortearGiroPorPeso(rotacao, pesos, aleatorio);
      expect(fatiaNoPonteiroPorPeso(r.rotacao, pesos)).toBe(r.indice);
      rotacao = r.rotacao;
    }
  });

  it('fatia de peso maior cai mais vezes', () => {
    const aleatorio = criarAleatorio(9);
    const contagem = [0, 0];
    for (let i = 0; i < 4000; i++) contagem[sortearGiroPorPeso(0, [1, 3], aleatorio).indice] += 1;
    expect(contagem[1] / 4000).toBeGreaterThan(0.7);
    expect(contagem[1] / 4000).toBeLessThan(0.8);
  });
});
