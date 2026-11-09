import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_ROUNDS, type Round } from '@/batalha/motor';
import { narrarRound } from '@/batalha/narracao';
import { Botao } from '@/components/Botao';
import { Cabecalho } from '@/components/Cabecalho';
import { buscarJogador, usePartida } from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Batalha (SCRUM-24 e SCRUM-26): a narração épica, round a round. As imagens dos
// combates e as chances de vitória ficam para o fim, na tela de Resultado.
export default function Batalha() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [pagina, setPagina] = useState(0);

  const batalha = partida?.batalha;
  const eventos = batalha?.resultado.eventos ?? [];
  const rounds = [...new Set(eventos.map((e) => e.round))];

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
  const jogador = (id: number) => buscarJogador(partida, id)?.nome ?? '?';
  const blocos = narrarRound(eventos, round, jogador);

  function avancar() {
    if (ultimo) router.push('/partida/resultado');
    else setPagina(pagina + 1);
  }

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Batalha" subtitulo={tituloDoRound(round)} />

      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.arena}>
          <Text style={styles.arenaTexto}>
            {round === 'final' ? 'Clareira no centro da savana' : 'Savana com lago e penhasco'}
          </Text>
        </View>

        {blocos.map((b, i) =>
          b.fora ? (
            <View key={i} style={styles.combate}>
              <Text style={styles.narracao}>{b.texto}</Text>
              <Text style={styles.fora}>{b.fora} FORA!</Text>
            </View>
          ) : (
            <Text key={i} style={[styles.narracao, styles.solta, i === 0 && styles.abertura]}>
              {b.texto}
            </Text>
          ),
        )}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: bottom + 12 }]}>
        <Botao
          titulo={ultimo ? 'Ver resultado' : proximo === 'final' ? 'Duelo final' : 'Próximo round'}
          onPress={avancar}
        />
        {!ultimo ? (
          <Pressable onPress={() => router.push('/partida/resultado')} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Pular para o resultado</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
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
  combate: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.dourado,
    backgroundColor: 'rgba(140,107,31,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  narracao: {
    fontFamily: fontes.textoItalico,
    fontSize: 15,
    lineHeight: 23,
    color: cores.texto,
  },
  solta: {
    paddingHorizontal: 4,
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
    gap: 12,
  },
  link: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
});
