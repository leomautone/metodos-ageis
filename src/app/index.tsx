import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { Estrela } from '@/components/Estrela';
import { Painel } from '@/components/Painel';
import { Rotulo } from '@/components/Rotulo';
import { PERSONAGENS } from '@/data/personagens';
import { descreverFase, rotaDaPartida, salvarPartida, usePartida } from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Letras do logo em peças douradas, cada uma levemente girada (graus).
const LOGO = [
  [['A', 4], ['L', -3], ['L', 2]],
  [['I', -5], ['N', 3]],
  [['D', -2], ['R', 4], ['A', -3], ['F', 2], ['T', -4]],
] as const;

export default function Inicio() {
  const partida = usePartida();
  const { top, bottom } = useSafeAreaInsets();

  function novaPartida() {
    salvarPartida(null);
    router.push('/partida/nova');
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={[styles.conteudo, { paddingTop: top + 40, paddingBottom: bottom + 24 }]}
    >
      <View style={styles.logo} accessibilityRole="header" accessibilityLabel="All-in Draft">
        {LOGO.map((linha, i) => (
          <View key={i} style={styles.linhaLogo}>
            {linha.map(([letra, giro], j) => (
              <View key={j} style={[styles.peca, { transform: [{ rotate: `${giro}deg` }] }]}>
                <Text style={styles.letra}>{letra}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={[styles.estrela, { left: 0, top: -20 }]}>
          <Estrela tamanho={30} />
        </View>
        <View style={[styles.estrela, { right: 0, top: 0 }]}>
          <Estrela tamanho={16} />
        </View>
        <View style={[styles.estrela, { left: -8, bottom: -40 }]}>
          <Estrela tamanho={14} />
        </View>
        <View style={[styles.estrela, { right: -12, bottom: -50 }]}>
          <Estrela tamanho={34} />
        </View>
      </View>

      <Text style={styles.chamada}>
        Monte seu time num leilão.{'\n'}Veja ele lutar até o último.
      </Text>

      <Painel style={styles.tema}>
        <View>
          <Rotulo>Tema da partida</Rotulo>
          <Text style={styles.temaNome}>Animais</Text>
        </View>
        <Text style={styles.temaQtd}>{PERSONAGENS.length} personagens</Text>
      </Painel>

      <View style={styles.botoes}>
        <Botao titulo="Nova partida" onPress={novaPartida} />
        <View>
          <Botao
            titulo="Continuar partida"
            variante="secundario"
            onPress={partida ? () => router.push(rotaDaPartida(partida)) : undefined}
          />
          <Text style={styles.legenda}>{partida ? descreverFase(partida) : 'Nenhuma partida em andamento'}</Text>
        </View>
        <Botao titulo="Consultar personagens" variante="secundario" onPress={() => router.push('/personagens')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  logo: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 30,
    paddingHorizontal: 60,
  },
  linhaLogo: {
    flexDirection: 'row',
    gap: 6,
  },
  peca: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: cores.douradoClaro,
    backgroundColor: cores.dourado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letra: {
    fontFamily: fontes.tituloPreto,
    fontSize: 26,
    color: cores.fundo,
    includeFontPadding: false,
  },
  estrela: {
    position: 'absolute',
  },
  chamada: {
    fontFamily: fontes.texto,
    fontSize: 16,
    lineHeight: 24,
    color: cores.textoSuave,
    textAlign: 'center',
    marginTop: 64,
  },
  tema: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  temaNome: {
    fontFamily: fontes.titulo,
    fontSize: 22,
    color: cores.douradoClaro,
    marginTop: 2,
  },
  temaQtd: {
    fontFamily: fontes.texto,
    fontSize: 14,
    color: cores.textoSuave,
  },
  botoes: {
    gap: 14,
    marginTop: 'auto',
    paddingTop: 36,
  },
  legenda: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
    marginTop: 4,
  },
});
