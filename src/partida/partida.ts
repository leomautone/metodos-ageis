import { useSyncExternalStore } from 'react';

import type { ResultadoBatalha } from '@/batalha/motor';
import { PERSONAGENS } from '@/data/personagens';

// Estado da partida em andamento, compartilhado entre as telas.
// Por enquanto fica só na memória: fechar o app perde a partida.

export const MIN_JOGADORES = 3;
export const MAX_JOGADORES = 5;
export const SALDO_INICIAL = 20; // em reais; os lances andam de R$ 1 em R$ 1
export const TAMANHO_TIME = 3;

export type Jogador = {
  id: number;
  nome: string;
  saldo: number;
  time: string[]; // códigos dos personagens
};

// Como cada personagem saiu do leilão.
export type Venda = {
  codigo: string;
  jogadorId: number | null; // null = foi para a repescagem
  valor: number;
  tipo: 'lance' | 'repescagem' | 'obrigatorio';
  // Rolagens de dado do desempate, quando houve (jogadorId → resultados).
  dados?: Record<number, number[]>;
};

export type Partida = {
  jogadores: Jogador[];
  // Personagens sorteados, na ordem em que vão a leilão.
  fila: string[];
  // Posição na fila do personagem em leilão agora.
  indiceAtual: number;
  // Personagens sem lance aguardando a repescagem (no máximo 3).
  repescagem: string[];
  vendas: Venda[];
  // Venda fechada no leilão esperando o registro da carta (QR).
  pendente: Venda | null;
  // Chances antes da luta e a batalha sorteada, depois do leilão.
  batalha: {
    chances: Record<number, number>;
    resultado: ResultadoBatalha;
  } | null;
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
  return { jogadores, fila, indiceAtual: 0, repescagem: [], vendas: [], pendente: null, batalha: null };
}

// Os lances andam de R$ 1 em R$ 1, então o valor é sempre inteiro.
export function formatarReais(valor: number) {
  return `R$ ${valor}`;
}

export function buscarJogador(partida: Partida, id: number | null) {
  return partida.jogadores.find((j) => j.id === id);
}

// Para onde "Continuar partida" leva.
export function rotaDaPartida(partida: Partida) {
  if (partida.pendente) return '/partida/registrar' as const;
  if (partida.indiceAtual < partida.fila.length) return '/partida/leilao' as const;
  if (!partida.batalha) return '/partida/times' as const;
  return '/partida/batalha' as const;
}

export function descreverFase(partida: Partida) {
  const n = `${partida.jogadores.length} jogadores`;
  if (partida.indiceAtual < partida.fila.length || partida.pendente) return `Leilão em andamento · ${n}`;
  if (!partida.batalha) return `Times prontos · ${n}`;
  return `Batalha em andamento · ${n}`;
}
