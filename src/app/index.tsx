import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { Painel } from '@/components/Painel';
import { usePartida } from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Tela Início. Os botões ganham ação conforme cada tela for criada.
export default function Inicio() {
  const partida = usePartida();

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.cabecalho}>
        <Text style={styles.naipe}>♠ ♥ ♣ ♦</Text>
        <Text style={styles.titulo}>All-in Draft</Text>
        <Text style={styles.subtitulo}>Animais</Text>
      </View>

      <Painel style={styles.menu}>
        <Botao
          titulo="Nova partida"
          detalhe="3 a 5 jogadores"
          onPress={() => router.push('/partida/nova')}
        />
        <Botao
          titulo="Continuar partida"
          detalhe={partida ? 'voltar ao leilão' : 'nenhuma partida em andamento'}
          onPress={partida ? () => router.push('/partida/leilao') : undefined}
        />
        <Botao
          titulo="Consultar personagens"
          detalhe="atributos, Poder e habilidades"
          onPress={() => router.push('/personagens')}
        />
      </Painel>

      <Text style={styles.rodape}>Métodos Ágeis · Ibmec 2026.2</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
    padding: 24,
    justifyContent: 'center',
  },
  cabecalho: {
    alignItems: 'center',
    marginBottom: 32,
  },
  naipe: {
    color: cores.dourado,
    fontSize: 18,
    letterSpacing: 6,
    marginBottom: 8,
  },
  titulo: {
    fontFamily: fontes.titulo,
    fontSize: 40,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: fontes.tituloRegular,
    fontSize: 18,
    color: cores.texto,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  menu: {
    gap: 14,
    paddingVertical: 28,
  },
  rodape: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
    marginTop: 32,
  },
});
