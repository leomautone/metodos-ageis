import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cores, fontes } from '@/theme';

type Props = {
  titulo: string;
  subtitulo?: string;
  // Troca o "voltar" padrão, ex.: pedir confirmação antes de sair.
  onVoltar?: () => void;
};

// Volta para a tela anterior; sem histórico (ex.: app reaberto), vai para o Início.
export function voltar() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// Cabeçalho das telas internas: voltar, título em Cinzel, subtítulo e filete dourado.
export function Cabecalho({ titulo, subtitulo, onVoltar }: Props) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.cabecalho, { paddingTop: top + 8 }]}>
      <View style={styles.linha}>
        <Pressable
          onPress={onVoltar ?? voltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={12}
          style={styles.voltar}
        >
          <Text style={styles.seta}>‹</Text>
        </Pressable>
        <Text style={styles.titulo} numberOfLines={1}>
          {titulo}
        </Text>
      </View>
      {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
      <View style={styles.filete} />
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    backgroundColor: cores.fundo,
    paddingHorizontal: 24,
  },
  linha: {
    justifyContent: 'center',
    minHeight: 32,
  },
  voltar: {
    position: 'absolute',
    left: -4,
    zIndex: 1,
  },
  seta: {
    fontFamily: fontes.texto,
    fontSize: 34,
    lineHeight: 38,
    color: cores.douradoClaro,
  },
  titulo: {
    fontFamily: fontes.titulo,
    fontSize: 22,
    letterSpacing: 0.44,
    color: cores.douradoClaro,
    textAlign: 'center',
    marginHorizontal: 28,
  },
  subtitulo: {
    fontFamily: fontes.numero,
    fontSize: 13,
    letterSpacing: 0.78,
    color: cores.textoSuave,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  filete: {
    height: 1,
    backgroundColor: cores.douradoEscuro,
    marginTop: 6,
  },
});
