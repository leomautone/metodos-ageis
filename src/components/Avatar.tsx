import { StyleSheet, Text, View } from 'react-native';

import { corDoJogador, cores, fontes } from '@/theme';

type Props = {
  jogadorId: number;
  // Letra ou número mostrado no círculo.
  texto: string;
  tamanho?: number;
};

// Círculo colorido que identifica o jogador em todas as telas.
export function Avatar({ jogadorId, texto, tamanho = 36 }: Props) {
  return (
    <View
      style={[
        styles.circulo,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: corDoJogador(jogadorId) },
      ]}
    >
      <Text style={[styles.texto, { fontSize: tamanho * 0.45 }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontFamily: fontes.numeroForte,
    color: cores.fundo,
    includeFontPadding: false,
  },
});
