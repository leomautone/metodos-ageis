import { describe, expect, it } from '@jest/globals';

import { criarAleatorio, simularBatalha } from '../motor';
import { nome } from '../narracao';
import { conferirNarracao, montarRoteiro, rodadas } from '../narracaoIA';

const times = [
  { jogadorId: 1, codigos: ['ANI-011', 'ANI-027', 'ANI-017'] },
  { jogadorId: 2, codigos: ['ANI-013', 'ANI-022', 'ANI-014'] },
  { jogadorId: 3, codigos: ['ANI-019', 'ANI-010', 'ANI-016'] },
];
const jogadores = times.map((t) => ({ id: t.jogadorId, nome: `J${t.jogadorId}`, time: t.codigos, sorte: [] }));
const resultado = simularBatalha(times, criarAleatorio(11));

// Uma resposta "perfeita" da IA: um bloco por evento, com o FORA certo nos duelos.
function respostaCerta() {
  return {
    modelo: 'claude-opus-5-5',
    rounds: rodadas(resultado.eventos).map((round) => ({
      round: String(round),
      blocos: [
        { texto: 'Abertura épica.', fora: null },
        ...resultado.eventos
          .filter((e) => e.round === round)
          .map((e) => ({ texto: 'Algo épico acontece.', fora: e.tipo === 'duelo' ? nome(e.eliminado) : null })),
      ],
    })),
  };
}

describe('roteiro para a IA', () => {
  it('leva nomes e acontecimentos, sem números de poder', () => {
    const roteiro = montarRoteiro(resultado, jogadores);
    expect(roteiro.rounds.map((r) => r.round)).toEqual(rodadas(resultado.eventos).map(String));
    const duelo = roteiro.rounds.flatMap((r) => r.eventos).find((e) => e.tipo === 'duelo')!;
    expect(duelo.atacante?.nome).toBeTruthy();
    expect(duelo.eliminado).toBeTruthy();
    expect(JSON.stringify(roteiro)).not.toContain('poder');
  });
});

describe('conferência da narração da IA', () => {
  it('aceita a narração quando os FORA batem com o roteiro', () => {
    const n = conferirNarracao(respostaCerta(), resultado.eventos);
    expect(n).not.toBeNull();
    expect(Object.keys(n!.rounds)).toEqual(rodadas(resultado.eventos).map(String));
    expect(n!.modelo).toBe('claude-opus-5-5');
  });

  it('recusa só o round em que a IA inventou ou trocou uma eliminação', () => {
    const r = respostaCerta();
    const comDuelo = r.rounds.find((x) => x.blocos.some((b) => b.fora))!;
    comDuelo.blocos.find((b) => b.fora)!.fora = 'Dragão Inventado';
    const n = conferirNarracao(r, resultado.eventos)!;
    expect(n.rounds[comDuelo.round]).toBeUndefined();
    expect(Object.keys(n.rounds).length).toBe(r.rounds.length - 1);
  });

  it('recusa resposta sem rounds ou com formato estranho', () => {
    expect(conferirNarracao({}, resultado.eventos)).toBeNull();
    expect(conferirNarracao({ rounds: [{ round: '1', blocos: [{ texto: 42 }] }] }, resultado.eventos)).toBeNull();
  });
});
