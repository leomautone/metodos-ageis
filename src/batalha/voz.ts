import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useSyncExternalStore } from 'react';

// Voz do narrador: a lista das vozes em português do aparelho, a escolhida
// pelo grupo (guardada no celular) e a escolha automática quando ninguém escolheu.

const CHAVE = 'all-in-draft:voz';

export type Qualidade = 'Premium' | 'Aprimorada' | 'Padrão' | 'Robótica';

export type VozPt = { id: string; nome: string; qualidade: Qualidade; idioma: string };

// As vozes "Eloquence" (Eddy, Flo, Reed, Rocko, Grandpa…) do iOS soam bem
// robóticas; ficam por último e nunca são escolhidas sozinhas.
export function qualidadeDaVoz(v: Pick<Speech.Voice, 'identifier' | 'quality'>): Qualidade {
  const id = v.identifier.toLowerCase();
  if (id.includes('eloquence') || id.includes('speech.synthesis')) return 'Robótica';
  if (id.includes('premium')) return 'Premium';
  if (v.quality === Speech.VoiceQuality.Enhanced || id.includes('enhanced')) return 'Aprimorada';
  return 'Padrão';
}

const ORDEM: Record<Qualidade, number> = { Premium: 0, Aprimorada: 1, 'Padrão': 2, 'Robótica': 3 };

// Vozes em português, as melhores primeiro (Brasil antes de Portugal).
export function vozesEmPortugues(vozes: Speech.Voice[]): VozPt[] {
  const vistas = new Set<string>();
  return vozes
    .filter((v) => v.language?.toLowerCase().startsWith('pt'))
    .map((v) => ({
      id: v.identifier,
      nome: v.name,
      qualidade: qualidadeDaVoz(v),
      idioma: v.language.replace('_', '-'),
    }))
    .filter((v) => (vistas.has(v.id) ? false : (vistas.add(v.id), true)))
    .sort((a, b) => {
      const br = Number(!a.idioma.toLowerCase().endsWith('br')) - Number(!b.idioma.toLowerCase().endsWith('br'));
      return br || ORDEM[a.qualidade] - ORDEM[b.qualidade] || a.nome.localeCompare(b.nome);
    });
}

// Sem escolha do grupo: a melhor voz que não seja robótica.
export function vozAutomatica(vozes: VozPt[]) {
  return vozes.find((v) => v.qualidade !== 'Robótica')?.id;
}

// Escolha do grupo, compartilhada entre as telas e guardada no celular.
let escolhida: string | null = null;
const ouvintes = new Set<() => void>();

AsyncStorage.getItem(CHAVE)
  .then((valor) => {
    if (valor && escolhida === null) {
      escolhida = valor;
      ouvintes.forEach((o) => o());
    }
  })
  .catch(() => {});

export function vozEscolhida() {
  return escolhida;
}

export function escolherVoz(id: string | null) {
  escolhida = id;
  ouvintes.forEach((o) => o());
  (id ? AsyncStorage.setItem(CHAVE, id) : AsyncStorage.removeItem(CHAVE)).catch(() => {});
}

export function useVozEscolhida() {
  return useSyncExternalStore(
    (ouvir) => {
      ouvintes.add(ouvir);
      return () => ouvintes.delete(ouvir);
    },
    () => escolhida,
  );
}

export const FRASE_TESTE =
  'Round 1! Os tambores da savana rufam e o Leão-africano parte para cima do Crocodilo. Crocodilo... fora!';
