import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';

import type { Bloco } from './narracao';
import { vozAutomatica, vozEscolhida, vozesEmPortugues } from './voz';

// Narrador em voz alta: lê a batalha bloco a bloco com a voz do aparelho
// (pt-BR, sem internet), faz uma pausa dramática antes de cada "FORA!" e passa
// sozinho para o próximo round.

export type Posicao = { pagina: number; bloco: number };

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
  // Cada começo/parada abre uma "sessão" nova; callbacks de sessões velhas são ignorados.
  const sessao = useRef(0);
  const pausadoRef = useRef(false);
  const pendente = useRef<(() => void) | null>(null);
  const voz = useRef<string | undefined>(undefined);
  const deps = useRef({ blocosDaPagina, totalPaginas, irPara });
  useEffect(() => {
    deps.current = { blocosDaPagina, totalPaginas, irPara };
  });

  useEffect(() => {
    let vivo = true;
    Speech.getAvailableVoicesAsync()
      .then((vozes) => {
        if (vivo) voz.current = vozAutomatica(vozesEmPortugues(vozes));
      })
      .catch(() => {});
    return () => {
      vivo = false;
      sessao.current += 1;
      Speech.stop();
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

  function falar(minha: number, texto: string, tom: Tom, depois: () => void) {
    Speech.speak(textoParaFala(texto), {
      language: 'pt-BR',
      // A voz que o grupo escolheu; sem escolha, a melhor que não seja robótica.
      voice: vozEscolhida() ?? voz.current,
      rate: tom.rate,
      pitch: tom.pitch,
      // Sessão de áudio própria: toca mesmo com outros sons e mistura bem.
      useApplicationAudioSession: false,
      onDone: () => {
        if (minha === sessao.current) depois();
      },
    });
  }

  function terminar() {
    setPosicao(null);
    setPausado(false);
    pausadoRef.current = false;
    pendente.current = null;
    deactivateKeepAwake(TAG_TELA).catch(() => {});
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
    if (b.fora) {
      const fora = b.fora;
      falar(minha, b.texto, NORMAL, () =>
        agendar(minha, () => falar(minha, `${fora}... FORA!`, FORA, proximo), PAUSA_ANTES_DO_FORA),
      );
    } else {
      falar(minha, b.texto, bloco === 0 ? ABERTURA : NORMAL, proximo);
    }
  }

  function reiniciar() {
    sessao.current += 1;
    Speech.stop();
    pausadoRef.current = false;
    pendente.current = null;
    setPausado(false);
    return sessao.current;
  }

  return {
    posicao,
    pausado,
    ativo: posicao !== null,
    comecar(pagina: number) {
      const minha = reiniciar();
      activateKeepAwakeAsync(TAG_TELA).catch(() => {});
      narrar(pagina, 0, minha);
    },
    parar() {
      reiniciar();
      terminar();
    },
    pausarOuContinuar() {
      if (pausadoRef.current) {
        pausadoRef.current = false;
        setPausado(false);
        const fn = pendente.current;
        pendente.current = null;
        if (fn) fn();
        else Speech.resume();
      } else {
        pausadoRef.current = true;
        setPausado(true);
        Speech.pause();
      }
    },
    pular() {
      if (!posicao) return;
      const minha = reiniciar();
      narrar(posicao.pagina, posicao.bloco + 1, minha);
    },
  };
}
