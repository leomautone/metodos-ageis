import { useSyncExternalStore } from 'react';

import { PERSONAGENS } from '@/data/personagens';

// Estado da partida em andamento, compartilhado entre as telas.
// Por enquanto fica só na memória: fechar o app perde a partida.

export const MIN_JOGADORES = 3;
export const MAX_JOGADORES = 5;
export const SALDO_INICIAL = 20; // em reais; os lances andam de R$ 1,00 em R$ 1,00
export const TAMANHO_TIME = 3;

export type Jogador = {
  id: number;
  nome: string;
  saldo: number;
  time: string[]; // códigos dos personagens
};

export type Partida = {
  jogadores: Jogador[];
  // Personagens sorteados, na ordem em que vão a leilão.
  fila: string[];
};

let partida: Partida | null = null;
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function usePartida() {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    () => partida,
  );
}

export function obterPartida() {
  return partida;
}

// Troca o estado inteiro; as telas sempre criam uma cópia nova antes de chamar.
export function salvarPartida(nova: Partida | null) {
  partida = nova;
  avisar();
}

// Embaralha uma cópia da lista (Fisher-Yates).
export function embaralhar<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Sorteia jogadores × 3 personagens entre os 30, já em ordem aleatória.
export function criarPartida(nomes: string[]): Partida {
  const jogadores = nomes.map((nome, i) => ({
    id: i + 1,
    nome: nome.trim(),
    saldo: SALDO_INICIAL,
    time: [],
  }));
  const fila = embaralhar(PERSONAGENS.map((p) => p.codigo)).slice(0, nomes.length * TAMANHO_TIME);
  return { jogadores, fila };
}

export function formatarReais(valor: number) {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}
