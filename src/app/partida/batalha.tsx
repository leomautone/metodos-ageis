import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_ROUNDS, type Round } from '@/batalha/motor';
import { narrarRound, type Bloco } from '@/batalha/narracao';
import { blocosDoRound } from '@/batalha/narracaoIA';
import { useNarrador } from '@/batalha/useNarrador';
import { Botao } from '@/components/Botao';
import { Cabecalho } from '@/components/Cabecalho';
import { buscarJogador, usePartida } from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Batalha (SCRUM-24 e SCRUM-26): a narração épica, round a round, na tela e em
// voz alta. As imagens dos combates e as chances ficam para a tela de Resultado.
export default function Batalha() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [pagina, setPagina] = useState(0);
  const rolagem = useRef<ScrollViewInstance>(null);
  const alturas = useRef<Record<number, number>>({});

  const batalha = partida?.batalha;
  const eventos = batalha?.resultado.eventos ?? [];
  const rounds = [...new Set(eventos.map((e) => e.round))];
  const jogador = (id: number) => (partida ? buscarJogador(partida, id)?.nome : undefined) ?? '?';

  // Texto da IA quando ele passou na conferência; senão, as frases prontas.
  const blocosDe = (p: number): Bloco[] => {
    const round = rounds[p];
    if (!batalha || round === undefined) return [];
    return blocosDoRound(batalha.narracao, round) ?? narrarRound(eventos, round, jogador);
  };

  function irParaPagina(p: number) {
    alturas.current = {};
    setPagina(p);
    rolagem.current?.scrollTo({ y: 0, animated: false });
  }

  const narrador = useNarrador(blocosDe, rounds.length, irParaPagina);
  const { parar } = narrador;

  // Saiu da tela (resultado, voltar): a voz para.
  useFocusEffect(useCallback(() => parar, [])); // eslint-disable-line react-hooks/exhaustive-deps

  // Rola até o trecho que está sendo lido.
  const lendo = narrador.posicao?.pagina === pagina ? narrador.posicao.bloco : null;
  useEffect(() => {
    if (lendo === null) return;
    const y = alturas.current[lendo];
    if (y !== undefined) rolagem.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }, [lendo, pagina]);

  // Sem nenhum combate (sobrou só um time), vai direto para o resultado.
  const semLuta = !!batalha && !eventos.some((e) => e.tipo !== 'vencedor');
  useEffect(() => {
    if (semLuta) router.replace('/partida/resultado');
  }, [semLuta]);

  if (!partida || !batalha || semLuta) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Batalha" />
      </View>
    );
  }

  const round = rounds[pagina];
  const ultimo = pagina === rounds.length - 1;
  const proximo = rounds[pagina + 1];
  const daIA = blocosDoRound(batalha.narracao, round);
  const blocos = blocosDe(pagina);

  function avancar() {
    if (ultimo) {
      narrador.parar();
      router.push('/partida/resultado');
      return;
    }
    irParaPagina(pagina + 1);
    // Narrando: continua a voz já no próximo round.
    if (narrador.ativo) narrador.comecar(pagina + 1);
  }

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Batalha" subtitulo={tituloDoRound(round)} />

      <ScrollView ref={rolagem} contentContainerStyle={styles.conteudo}>
        <View style={styles.arena}>
          <Text style={styles.arenaTexto}>
            {round === 'final' ? 'Clareira no centro da savana' : 'Savana com lago e penhasco'}
          </Text>
        </View>
        <Text style={[styles.narrador, daIA && styles.narradorIA]}>
          {daIA ? '✦ Narrado pela IA' : 'Narração padrão (a IA não respondeu)'}
        </Text>

        {blocos.map((b, i) => (
          <View
            key={`${pagina}-${i}`}
            onLayout={(e) => {
              alturas.current[i] = e.nativeEvent.layout.y;
            }}
            style={[b.fora ? styles.combate : styles.solta, lendo === i && styles.lendo]}
          >
            <Text style={[styles.narracao, !b.fora && i === 0 && styles.abertura]}>{b.texto}</Text>
            {b.fora ? <Text style={styles.fora}>{b.fora} FORA!</Text> : null}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: bottom + 12 }]}>
        {narrador.ativo ? (
          <View style={styles.controles}>
            <Controle
              rotulo={narrador.pausado ? '▶ Continuar' : '⏸ Pausar'}
              onPress={narrador.pausarOuContinuar}
            />
            <Controle rotulo="⏭ Pular trecho" onPress={narrador.pular} />
            <Controle rotulo="■ Parar" onPress={narrador.parar} />
          </View>
        ) : (
          <Botao titulo="🔊 Narrar em voz alta" variante="secundario" onPress={() => narrador.comecar(pagina)} />
        )}
        <Botao
          titulo={ultimo ? 'Ver resultado' : proximo === 'final' ? 'Duelo final' : 'Próximo round'}
          onPress={avancar}
        />
        {!ultimo ? (
          <Pressable
            onPress={() => {
              narrador.parar();
              router.push('/partida/resultado');
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.link}>Pular para o resultado</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Controle({ rotulo, onPress }: { rotulo: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.controle}>
      <Text style={styles.controleTexto}>{rotulo}</Text>
    </Pressable>
  );
}

function tituloDoRound(round: Round) {
  return round === 'final' ? 'Duelo final' : `Round ${round} de ${MAX_ROUNDS}`;
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  arena: {
    height: 30,
    borderRadius: 15,
    backgroundColor: cores.painelClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arenaTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
  },
  narrador: {
    fontFamily: fontes.numero,
    fontSize: 11,
    letterSpacing: 0.8,
    color: cores.textoApagado,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  narradorIA: {
    color: cores.dourado,
  },
  combate: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.dourado,
    backgroundColor: 'rgba(140,107,31,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  solta: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  // Trecho que a voz está lendo agora.
  lendo: {
    borderWidth: 2,
    borderColor: cores.douradoClaro,
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  narracao: {
    fontFamily: fontes.textoItalico,
    fontSize: 15,
    lineHeight: 23,
    color: cores.texto,
  },
  abertura: {
    fontFamily: fontes.titulo,
    fontSize: 17,
    lineHeight: 25,
    color: cores.douradoClaro,
  },
  fora: {
    fontFamily: fontes.tituloPreto,
    fontSize: 20,
    letterSpacing: 1,
    color: cores.zebra,
    textAlign: 'right',
  },
  rodape: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 10,
  },
  controles: {
    flexDirection: 'row',
    gap: 8,
  },
  controle: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cores.dourado,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  controleTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
  },
  link: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
});
