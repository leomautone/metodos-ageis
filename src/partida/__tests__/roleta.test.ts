import { describe, expect, it } from '@jest/globals';

import { criarAleatorio } from '@/batalha/motor';

import { centroDaFatia, fatiaNoPonteiro, sortearGiro } from '../roleta';

describe('roleta', () => {
  it('sem girar, o ponteiro está na borda entre a última e a primeira fatia', () => {
    expect(fatiaNoPonteiro(1, 4)).toBe(3);
    expect(fatiaNoPonteiro(-1, 4)).toBe(0);
  });

  it('girar até o centro de uma fatia põe essa fatia no ponteiro', () => {
    for (let fatias = 2; fatias <= 5; fatias++) {
      for (let i = 0; i < fatias; i++) {
        expect(fatiaNoPonteiro(360 - centroDaFatia(i, fatias), fatias)).toBe(i);
      }
    }
  });

  it('a roda sempre para em cima de quem foi sorteado, depois de várias voltas', () => {
    const aleatorio = criarAleatorio(7);
    for (let fatias = 2; fatias <= 5; fatias++) {
      let rotacao = 0;
      for (let giro = 0; giro < 50; giro++) {
        const resultado = sortearGiro(rotacao, fatias, aleatorio);
        expect(resultado.rotacao - rotacao).toBeGreaterThanOrEqual(5 * 360);
        expect(fatiaNoPonteiro(resultado.rotacao, fatias)).toBe(resultado.indice);
        rotacao = resultado.rotacao;
      }
    }
  });

  it('dá chances parecidas para todo mundo', () => {
    const aleatorio = criarAleatorio(42);
    const contagem = [0, 0, 0];
    for (let i = 0; i < 3000; i++) contagem[sortearGiro(0, 3, aleatorio).indice] += 1;
    for (const c of contagem) expect(c).toBeGreaterThan(900);
  });
});
