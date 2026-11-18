import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import type { Bloco } from './narracao';
import { SENHA_APP } from './narracaoIA';

// Voz de IA (ElevenLabs): o servidor transforma cada trecho da narração em MP3
// e o app toca. Sem internet ou sem a chave no servidor, o narrador usa a voz
// do aparelho.

export const URL_VOZ = 'https://all-in-draft-narracao.vercel.app/api/voz';
// Id especial da voz de IA na escolha de voz.
export const VOZ_IA = 'ia';
const TEMPO_STATUS_MS = 6000;
const TEMPO_CARREGAR_MS = 20_000;

// O texto que vai para a voz: nos combates, o "FORA!" vem no mesmo áudio, depois de uma pausa.
export function textoParaIA(b: Bloco) {
  return b.fora ? `${b.texto} ... ${b.fora}... FORA!` : b.texto;
}

// O servidor está com a voz de IA ligada (chave configurada) e há internet?
export async function vozIADisponivel() {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_STATUS_MS);
  try {
    const r = await fetch(`${URL_VOZ}?status=1`, { headers: { 'x-all-in-draft': SENHA_APP }, signal: controle.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(limite);
  }
}

let modoDeAudioPronto = false;
function prepararModoDeAudio() {
  if (modoDeAudioPronto) return;
  modoDeAudioPronto = true;
  // Toca mesmo com o iPhone no modo silencioso.
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
    modoDeAudioPronto = false;
  });
}

function fonte(texto: string) {
  return { uri: `${URL_VOZ}?t=${encodeURIComponent(texto)}`, headers: { 'x-all-in-draft': SENHA_APP } };
}

// Toca os trechos um a um; o próximo trecho já vai carregando enquanto o atual toca.
export class TocadorIA {
  private preparados = new Map<string, AudioPlayer>();
  private atual: AudioPlayer | null = null;
  private relogio: ReturnType<typeof setTimeout> | null = null;

  preparar(texto: string) {
    prepararModoDeAudio();
    if (!this.preparados.has(texto)) this.preparados.set(texto, createAudioPlayer(fonte(texto)));
  }

  // aoFalhar: o áudio não carregou a tempo (sem internet, limite do plano...).
  tocar(texto: string, aoTerminar: () => void, aoFalhar: () => void) {
    this.pararAtual();
    this.preparar(texto);
    const player = this.preparados.get(texto)!;
    this.preparados.delete(texto);
    this.atual = player;
    let feito = false;
    const assinatura = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && this.relogio) {
        clearTimeout(this.relogio);
        this.relogio = null;
      }
      if (status.didJustFinish && !feito) {
        feito = true;
        assinatura.remove();
        aoTerminar();
      }
    });
    this.relogio = setTimeout(() => {
      this.relogio = null;
      if (!feito && !player.isLoaded) {
        feito = true;
        assinatura.remove();
        aoFalhar();
      }
    }, TEMPO_CARREGAR_MS);
    player.play();
  }

  pausar() {
    this.atual?.pause();
  }

  continuar() {
    this.atual?.play();
  }

  pararAtual() {
    if (this.relogio) clearTimeout(this.relogio);
    this.relogio = null;
    if (this.atual) {
      this.atual.pause();
      this.atual.remove();
      this.atual = null;
    }
  }

  limpar() {
    this.pararAtual();
    this.preparados.forEach((p) => p.remove());
    this.preparados.clear();
  }
}
