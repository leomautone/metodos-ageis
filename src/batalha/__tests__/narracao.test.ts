import { describe, expect, it } from '@jest/globals';

import { criarAleatorio, simularBatalha, type Evento } from '../motor';
import { narrarRound } from '../narracao';

const base: Evento = {
  round: 1,
  tipo: 'duelo',
  zona: 'terra',
  atacante: null,
  alvo: null,
  poder: [7, 6],
  eliminado: null,
  habilidades_usadas: [],
  zebra: false,
};
const jogador = () => 'Leo';

describe('narração épica', () => {
  it('cada combate termina com quem saiu: "FORA!"', () => {
    const blocos = narrarRound([{ ...base, atacante: 'ANI-005', alvo: 'ANI-011', eliminado: 'ANI-011' }], 1, jogador);
    const combate = blocos.find((b) => b.fora);
    expect(combate?.fora).toBe('Leão-africano');
    expect(combate?.texto).toContain('Tigre-siberiano');
  });

  it('abre o round e fecha com suspense', () => {
    const blocos = narrarRound([{ ...base, atacante: 'ANI-005', alvo: 'ANI-011', eliminado: 'ANI-011' }], 2, jogador);
    expect(blocos[0].texto).toMatch(/^Round 2!/);
    expect(blocos.at(-1)?.fora).toBeUndefined();
    expect(blocos).toHaveLength(3);
  });

  it('dá a habilidade a quem venceu', () => {
    const blocos = narrarRound(
      [{ ...base, atacante: 'ANI-005', alvo: 'ANI-011', eliminado: 'ANI-011', habilidades_usadas: ['Emboscada: +1 no 1º ataque'] }],
      1,
      jogador,
    );
    expect(blocos.find((b) => b.fora)?.texto).toContain('Emboscada');
  });

  it('não credita o veneno do perdedor ao vencedor, e avisa que o vencedor sai enfraquecido', () => {
    const blocos = narrarRound(
      [
        {
          ...base,
          atacante: 'ANI-015',
          alvo: 'ANI-026',
          eliminado: 'ANI-026',
          habilidades_usadas: ['Veneno: quem lutar com ele fica −1'],
        },
      ],
      1,
      jogador,
    );
    const combate = blocos.find((b) => b.fora)!;
    expect(combate.fora).toBe('Dragão-de-komodo');
    expect(combate.texto).not.toContain('Veneno!');
    expect(combate.texto).toMatch(/veneno|venenosa/);
    expect(combate.texto).toContain('Hiena-malhada');
  });

  it('esquiva não elimina ninguém', () => {
    const blocos = narrarRound(
      [{ ...base, tipo: 'esquiva', atacante: 'ANI-005', alvo: 'ANI-017', habilidades_usadas: ['Salto: esquiva o 1º ataque recebido'] }],
      1,
      jogador,
    );
    expect(blocos.some((b) => b.fora)).toBe(false);
    expect(blocos[1].texto).toContain('Salto');
  });

  it('avisa quando ninguém ataca', () => {
    expect(narrarRound([], 2, jogador)[1].texto).toContain('Ninguém ataca');
  });

  it('a mesma batalha sempre gera o mesmo texto, e uma batalha real tem um FORA! por eliminação', () => {
    const times = [
      { jogadorId: 1, codigos: ['ANI-011', 'ANI-027', 'ANI-017'] },
      { jogadorId: 2, codigos: ['ANI-013', 'ANI-022', 'ANI-014'] },
      { jogadorId: 3, codigos: ['ANI-019', 'ANI-010', 'ANI-016'] },
    ];
    const { eventos } = simularBatalha(times, criarAleatorio(11));
    const rounds = [...new Set(eventos.map((e) => e.round))];
    const narrar = () => rounds.flatMap((r) => narrarRound(eventos, r, (t) => `J${t}`));
    expect(narrar()).toEqual(narrar());
    const foras = narrar().filter((b) => b.fora).length;
    expect(foras).toBe(eventos.filter((e) => e.tipo === 'duelo').length);
    expect(narrar().at(-1)?.texto).toContain('continua de pé');
  });
});
