import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';

import type { Bloco } from './narracao';
import { vozAutomatica, vozEscolhida, vozesEmPortugues } from './voz';
import { textoParaIA, TocadorIA, VOZ_IA, vozIADisponivel } from './vozIA';

// Narrador em voz alta: lê a batalha bloco a bloco, faz uma pausa dramática
// antes de cada "FORA!" e passa sozinho para o próximo round. Usa a voz de IA
// (ElevenLabs) quando ela está ligada e há internet; senão, a voz do aparelho.

export type Posicao = { pagina: number; bloco: number };
type Modo = 'ia' | 'aparelho';

const PAUSA_ENTRE_BLOCOS = 700;
const PAUSA_ANTES_DO_FORA = 900;
const PAUSA_ENTRE_ROUNDS = 1800;
const TAG_TELA = 'narrador';

type Tom = { rate: number; pitch: number };
const ABERTURA: Tom = { rate: 0.95, pitch: 1.05 };
const NORMAL: Tom = { rate: 1, pitch: 1 };
const FORA: Tom = { rate: 0.8, pitch: 0.9 };

// Palavras em MAIÚSCULAS podem ser soletradas pela voz; vão para minúsculas.
export function textoParaFala(texto: string) {
  return texto
    .split(' ')
    .map((p) => (p.length > 1 && p === p.toUpperCase() && p !== p.toLowerCase() ? p.toLowerCase() : p))
    .join(' ');
}

export function useNarrador(
  blocosDaPagina: (pagina: number) => Bloco[],
  totalPaginas: number,
  irPara: (pagina: number) => void,
) {
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const [pausado, setPausado] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [modo, setModo] = useState<Modo | null>(null);
  // Cada começo/parada abre uma "sessão" nova; callbacks de sessões velhas são ignorados.
  const sessao = useRef(0);
  const pausadoRef = useRef(false);
  const pendente = useRef<(() => void) | null>(null);
  const modoRef = useRef<Modo>('aparelho');
  const tocador = useRef<TocadorIA | null>(null);
  const vozAparelho = useRef<string | undefined>(undefined);
  const deps = useRef({ blocosDaPagina, totalPaginas, irPara });
  useEffect(() => {
    deps.current = { blocosDaPagina, totalPaginas, irPara };
  });

  useEffect(() => {
    let vivo = true;
    Speech.getAvailableVoicesAsync()
      .then((vozes) => {
        if (vivo) vozAparelho.current = vozAutomatica(vozesEmPortugues(vozes));
      })
      .catch(() => {});
    return () => {
      vivo = false;
      sessao.current += 1;
      Speech.stop();
      tocador.current?.limpar();
      deactivateKeepAwake(TAG_TELA).catch(() => {});
    };
  }, []);

  function agendar(minha: number, fn: () => void, ms: number) {
    setTimeout(() => {
      if (minha !== sessao.current) return;
      if (pausadoRef.current) pendente.current = fn;
      else fn();
    }, ms);
  }

  function falarNoAparelho(minha: number, texto: string, tom: Tom, depois: () => void) {
    const escolhida = vozEscolhida();
    Speech.speak(textoParaFala(texto), {
      language: 'pt-BR',
      // A voz do aparelho que o grupo escolheu; sem escolha, a melhor que não seja robótica.
      voice: escolhida && escolhida !== VOZ_IA ? escolhida : vozAparelho.current,
      rate: tom.rate,
      pitch: tom.pitch,
      // Sessão de áudio própria: toca mesmo com outros sons e mistura bem.
      useApplicationAudioSession: false,
      onDone: () => {
        if (minha === sessao.current) depois();
      },
    });
  }

  function blocoNoAparelho(minha: number, b: Bloco, abertura: boolean, depois: () => void) {
    if (b.fora) {
      const fora = b.fora;
      falarNoAparelho(minha, b.texto, NORMAL, () =>
        agendar(minha, () => falarNoAparelho(minha, `${fora}... FORA!`, FORA, depois), PAUSA_ANTES_DO_FORA),
      );
    } else {
      falarNoAparelho(minha, b.texto, abertura ? ABERTURA : NORMAL, depois);
    }
  }

  function terminar() {
    setPosicao(null);
    setPausado(false);
    setPreparando(false);
    pausadoRef.current = false;
    pendente.current = null;
    deactivateKeepAwake(TAG_TELA).catch(() => {});
  }

  // O trecho que vem depois deste (no mesmo round ou no começo do próximo).
  function trechoSeguinte(pagina: number, bloco: number) {
    const { blocosDaPagina: blocosDe, totalPaginas: total } = deps.current;
    const desta = blocosDe(pagina);
    if (bloco + 1 < desta.length) return desta[bloco + 1];
    return pagina + 1 < total ? blocosDe(pagina + 1)[0] : undefined;
  }

  function narrar(pagina: number, bloco: number, minha: number) {
    if (minha !== sessao.current) return;
    const { blocosDaPagina: blocosDe, totalPaginas: total, irPara: ir } = deps.current;
    const blocos = blocosDe(pagina);
    if (bloco >= blocos.length) {
      if (pagina + 1 < total) {
        agendar(
          minha,
          () => {
            ir(pagina + 1);
            narrar(pagina + 1, 0, minha);
          },
          PAUSA_ENTRE_ROUNDS,
        );
      } else {
        terminar();
      }
      return;
    }
    setPosicao({ pagina, bloco });
    const b = blocos[bloco];
    const proximo = () => agendar(minha, () => narrar(pagina, bloco + 1, minha), PAUSA_ENTRE_BLOCOS);

    if (modoRef.current === 'ia' && tocador.current) {
      const seguinte = trechoSeguinte(pagina, bloco);
      if (seguinte) tocador.current.preparar(textoParaIA(seguinte));
      tocador.current.tocar(textoParaIA(b), proximo, () => {
        if (minha !== sessao.current) return;
        // A voz de IA não respondeu: segue com a voz do aparelho até o fim.
        modoRef.current = 'aparelho';
        setModo('aparelho');
        tocador.current?.limpar();
        blocoNoAparelho(minha, b, bloco === 0, proximo);
      });
    } else {
      blocoNoAparelho(minha, b, bloco === 0, proximo);
    }
  }

  function reiniciar() {
    sessao.current += 1;
    Speech.stop();
    tocador.current?.pararAtual();
    pausadoRef.current = false;
    pendente.current = null;
    setPausado(false);
    return sessao.current;
  }

  async function comecar(pagina: number) {
    const minha = reiniciar();
    activateKeepAwakeAsync(TAG_TELA).catch(() => {});
    const escolhida = vozEscolhida();
    let usarIA = false;
    if (escolhida === null || escolhida === VOZ_IA) {
      // No navegador, o som só pode começar no próprio toque: o 1º trecho já
      // começa a tocar aqui, antes de esperar a internet (no celular, nada muda).
      if (!tocador.current) tocador.current = new TocadorIA();
      const primeiro = deps.current.blocosDaPagina(pagina)[0];
      if (primeiro) tocador.current.destravar(textoParaIA(primeiro));
      setPreparando(true);
      usarIA = await vozIADisponivel();
      if (minha !== sessao.current) return;
      setPreparando(false);
      if (!usarIA) tocador.current.pararAtual();
    }
    modoRef.current = usarIA ? 'ia' : 'aparelho';
    setModo(modoRef.current);
    if (usarIA && !tocador.current) tocador.current = new TocadorIA();
    narrar(pagina, 0, minha);
  }

  return {
    posicao,
    pausado,
    // Verificando se a voz de IA está disponível.
    preparando,
    // Qual voz está narrando agora.
    modo,
    ativo: posicao !== null || preparando,
    comecar(pagina: number) {
      comecar(pagina).catch(() => {});
    },
    parar() {
      reiniciar();
      tocador.current?.limpar();
      terminar();
    },
    pausarOuContinuar() {
      if (pausadoRef.current) {
        pausadoRef.current = false;
        setPausado(false);
        const fn = pendente.current;
        pendente.current = null;
        if (fn) fn();
        else if (modoRef.current === 'ia') tocador.current?.continuar();
        else Speech.resume();
      } else {
        pausadoRef.current = true;
        setPausado(true);
        if (modoRef.current === 'ia') tocador.current?.pausar();
        else Speech.pause();
      }
    },
    pular() {
      if (!posicao) return;
      const minha = reiniciar();
      narrar(posicao.pagina, posicao.bloco + 1, minha);
    },
  };
}
