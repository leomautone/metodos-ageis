import { useSyncExternalStore } from 'react';

import type { ResultadoBatalha } from '@/batalha/motor';

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
  // lanceRepescagem = levou no leilão da repescagem; sobraRepescagem = ninguém deu lance e ficou com ele.
  tipo: 'lance' | 'repescagem' | 'obrigatorio' | 'lanceRepescagem' | 'sobraRepescagem';
  // Rolagens de dado do desempate, quando houve (jogadorId → resultados).
  dados?: Record<number, number[]>;
};

export type Partida = {
  jogadores: Jogador[];
  // Quantos leilões já terminaram (o total é jogadores × 3).
  indiceAtual: number;
  // Personagens sem lance aguardando a repescagem (no máximo 3).
  repescagem: string[];
  vendas: Venda[];
  // A ordem da repescagem já foi sorteada (o primeiro da lista é o da vez).
  repescagemSorteada: boolean;
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

// As cartas vêm do baralho físico: a partida começa só com os jogadores.
export function criarPartida(nomes: string[]): Partida {
  const jogadores = nomes.map((nome, i) => ({
    id: i + 1,
    nome: nome.trim(),
    saldo: SALDO_INICIAL,
    time: [],
  }));
  return { jogadores, indiceAtual: 0, repescagem: [], vendas: [], repescagemSorteada: false, batalha: null };
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
  if (partida.indiceAtual < partida.jogadores.length * TAMANHO_TIME) return '/partida/leilao' as const;
  if (partida.repescagem.length > 0) return '/partida/repescagem' as const;
  if (!partida.batalha) return '/partida/times' as const;
  return '/partida/batalha' as const;
}

export function descreverFase(partida: Partida) {
  const n = `${partida.jogadores.length} jogadores`;
  if (partida.indiceAtual < partida.jogadores.length * TAMANHO_TIME) return `Leilão em andamento · ${n}`;
  if (partida.repescagem.length > 0) return `Repescagem em andamento · ${n}`;
  if (!partida.batalha) return `Times prontos · ${n}`;
  return `Batalha em andamento · ${n}`;
}
