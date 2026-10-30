import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { calcularChances, criarAleatorio, SIMULACOES, simularBatalha } from '@/batalha/motor';
import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Cabecalho } from '@/components/Cabecalho';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { buscarPersonagem } from '@/data/personagens';
import { formatarReais, salvarPartida, TAMANHO_TIME, usePartida } from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Times (SCRUM-25): os personagens de cada jogador e o saldo final.
export default function Times() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [calculando, setCalculando] = useState(false);

  if (!partida) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Times" />
        <Text style={[styles.aviso, styles.margem]}>Nenhuma partida em andamento.</Text>
      </View>
    );
  }

  function irParaBatalha() {
    if (!partida) return;
    if (partida.batalha) {
      router.push('/partida/batalha');
      return;
    }
    setCalculando(true);
    // Deixa a tela mostrar "Calculando…" antes das 2.000 simulações.
    setTimeout(() => {
      const times = partida.jogadores.map((j) => ({ jogadorId: j.id, codigos: j.time }));
      const chances = calcularChances(times);
      const resultado = simularBatalha(times, criarAleatorio(Date.now()));
      salvarPartida({ ...partida, batalha: { chances, resultado } });
      setCalculando(false);
      router.push('/partida/batalha');
    }, 50);
  }

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Times" subtitulo="Leilão encerrado" onVoltar={() => router.dismissTo('/')} />

      <ScrollView contentContainerStyle={styles.conteudo}>
        {partida.jogadores.map((j) => (
          <View key={j.id} style={styles.time}>
            <View style={styles.timeTopo}>
              <Avatar jogadorId={j.id} texto={j.nome.charAt(0).toUpperCase()} tamanho={30} />
              <Text style={styles.nome} numberOfLines={1}>
                {j.nome}
              </Text>
              <Text style={styles.sobra}>Sobrou {formatarReais(j.saldo)}</Text>
            </View>
            <View style={styles.cartas}>
              {Array.from({ length: TAMANHO_TIME }, (_, i) => {
                const codigo = j.time[i];
                return (
                  <View key={i} style={styles.carta}>
                    {codigo ? (
                      <ImagemPersonagem codigo={codigo} style={styles.imagem} />
                    ) : (
                      <View style={[styles.imagem, styles.vaga]} />
                    )}
                    <Text style={styles.cartaNome} numberOfLines={1}>
                      {codigo ? buscarPersonagem(codigo)?.nome : 'vaga'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {partida.repescagem.length > 0 ? (
          <Text style={styles.aviso}>
            Ficaram na repescagem: {partida.repescagem.map((c) => buscarPersonagem(c)?.nome).join(', ')}. A
            distribuição da repescagem ainda não está no app.
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: bottom + 16 }]}>
        <Botao
          titulo={calculando ? 'Calculando…' : partida.batalha ? 'Ver a batalha' : 'Ir para a batalha'}
          onPress={irParaBatalha}
          desativado={calculando}
        />
        <Text style={styles.legenda}>Chances calculadas em {SIMULACOES.toLocaleString('pt-BR')} simulações</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  margem: {
    padding: 24,
  },
  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },
  time: {
    backgroundColor: cores.painel,
    borderColor: cores.douradoEscuro,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  timeTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nome: {
    flex: 1,
    fontFamily: fontes.textoForte,
    fontSize: 16,
    color: cores.texto,
  },
  sobra: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
  },
  cartas: {
    flexDirection: 'row',
    gap: 12,
  },
  carta: {
    flex: 1,
    gap: 3,
  },
  imagem: {
    height: 58,
    borderRadius: 8,
  },
  vaga: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.douradoEscuro,
  },
  cartaNome: {
    fontFamily: fontes.textoMedio,
    fontSize: 11,
    color: cores.texto,
    textAlign: 'center',
  },
  aviso: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  rodape: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 12,
  },
  legenda: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
  },
});
