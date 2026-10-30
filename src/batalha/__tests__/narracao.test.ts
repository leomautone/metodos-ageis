import { describe, expect, it } from '@jest/globals';

import type { Evento } from '../motor';
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

describe('narração sem IA', () => {
  it('dá a habilidade a quem venceu', () => {
    const texto = narrarRound(
      [{ ...base, atacante: 'ANI-005', alvo: 'ANI-011', eliminado: 'ANI-011', habilidades_usadas: ['Emboscada: +1 no 1º ataque'] }],
      1,
      jogador,
    );
    expect(texto).toContain('Tigre-siberiano leva a melhor com Emboscada');
  });

  it('não credita o veneno do perdedor ao vencedor', () => {
    const texto = narrarRound(
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
    expect(texto).not.toContain('com Veneno');
    expect(texto).toContain('o veneno fica: Hiena-malhada sai enfraquecido');
  });

  it('avisa quando ninguém ataca', () => {
    expect(narrarRound([], 2, jogador)).toContain('Ninguém arrisca');
  });
});
