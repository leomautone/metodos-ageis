import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

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

// No celular (Expo Go) a senha vai no cabeçalho.
function fonte(texto: string) {
  return { uri: `${URL_VOZ}?t=${encodeURIComponent(texto)}`, headers: { 'x-all-in-draft': SENHA_APP } };
}

// No navegador, o <audio> não manda cabeçalhos próprios: a senha vai no endereço.
export function urlWeb(texto: string) {
  return `${URL_VOZ}?t=${encodeURIComponent(texto)}&k=${SENHA_APP}`;
}

type Tocador = {
  destravar(texto: string): void;
  preparar(texto: string): void;
  tocar(texto: string, aoTerminar: () => void, aoFalhar: () => void): void;
  pausar(): void;
  continuar(): void;
  pararAtual(): void;
  limpar(): void;
};

// Celular: um player por trecho; o próximo já vai carregando enquanto o atual toca.
class TocadorNativo implements Tocador {
  private preparados = new Map<string, AudioPlayer>();
  private atual: AudioPlayer | null = null;
  private relogio: ReturnType<typeof setTimeout> | null = null;

  destravar() {}

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

// Navegador: UM só <audio>, que troca de trecho. O Safari do iPhone só deixa
// tocar som começado por um toque; depois disso, o mesmo elemento segue liberado.
class TocadorWeb implements Tocador {
  private el: HTMLAudioElement | null = null;
  private textoAtual: string | null = null;
  private relogio: ReturnType<typeof setTimeout> | null = null;
  private soltar: (() => void) | null = null;

  private elemento() {
    if (!this.el) {
      this.el = new Audio();
      this.el.preload = 'auto';
    }
    return this.el;
  }

  // Chamado direto no toque: já começa a tocar este trecho.
  destravar(texto: string) {
    const el = this.elemento();
    this.textoAtual = texto;
    el.src = urlWeb(texto);
    el.play().catch(() => {});
  }

  // Pede o trecho seguinte antes da hora: ele fica no cache e toca sem espera.
  preparar(texto: string) {
    fetch(urlWeb(texto)).catch(() => {});
  }

  tocar(texto: string, aoTerminar: () => void, aoFalhar: () => void) {
    this.soltarEventos();
    const el = this.elemento();
    let feito = false;
    const encerrar = (falhou: boolean) => {
      if (feito) return;
      feito = true;
      this.soltarEventos();
      if (falhou) aoFalhar();
      else aoTerminar();
    };
    const fim = () => encerrar(false);
    const erro = () => encerrar(true);
    const pronto = () => {
      if (this.relogio) clearTimeout(this.relogio);
      this.relogio = null;
    };
    el.addEventListener('ended', fim);
    el.addEventListener('error', erro);
    el.addEventListener('canplay', pronto);
    this.soltar = () => {
      el.removeEventListener('ended', fim);
      el.removeEventListener('error', erro);
      el.removeEventListener('canplay', pronto);
    };
    this.relogio = setTimeout(() => {
      this.relogio = null;
      if (el.readyState < 3) encerrar(true);
    }, TEMPO_CARREGAR_MS);

    // O trecho que o toque já começou: só acompanha até o fim.
    if (this.textoAtual === texto && !el.error) {
      if (el.ended) setTimeout(fim, 0);
      return;
    }
    this.textoAtual = texto;
    el.src = urlWeb(texto);
    el.play().catch((e: unknown) => {
      // Sem permissão para tocar (o navegador bloqueou): vai para a voz do aparelho.
      if (e instanceof Error && e.name === 'NotAllowedError') encerrar(true);
    });
  }

  pausar() {
    this.el?.pause();
  }

  continuar() {
    this.el?.play().catch(() => {});
  }

  private soltarEventos() {
    if (this.relogio) clearTimeout(this.relogio);
    this.relogio = null;
    this.soltar?.();
    this.soltar = null;
  }

  pararAtual() {
    this.soltarEventos();
    this.el?.pause();
    this.textoAtual = null;
  }

  limpar() {
    this.pararAtual();
  }
}

// Toca os trechos da narração com a voz de IA (escolhe o jeito certo para celular ou navegador).
export class TocadorIA implements Tocador {
  private impl: Tocador = Platform.OS === 'web' ? new TocadorWeb() : new TocadorNativo();

  destravar(texto: string) {
    this.impl.destravar(texto);
  }

  preparar(texto: string) {
    this.impl.preparar(texto);
  }

  tocar(texto: string, aoTerminar: () => void, aoFalhar: () => void) {
    this.impl.tocar(texto, aoTerminar, aoFalhar);
  }

  pausar() {
    this.impl.pausar();
  }

  continuar() {
    this.impl.continuar();
  }

  pararAtual() {
    this.impl.pararAtual();
  }

  limpar() {
    this.impl.limpar();
  }
}
