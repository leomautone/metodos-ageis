import { Pressable, StyleSheet, Text } from 'react-native';

import { cores, fontes } from '@/theme';

type Props = {
  titulo: string;
  onPress?: () => void;
  // Texto pequeno embaixo do título, ex.: "em breve".
  detalhe?: string;
  desativado?: boolean;
};

export function Botao({ titulo, onPress, detalhe, desativado }: Props) {
  const inativo = desativado || !onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo }}
      style={({ pressed }) => [
        styles.botao,
        pressed && styles.pressionado,
        inativo && styles.inativo,
      ]}
    >
      <Text style={[styles.titulo, inativo && styles.textoInativo]}>{titulo}</Text>
      {detalhe ? <Text style={styles.detalhe}>{detalhe}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    borderColor: cores.dourado,
    borderWidth: 2,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: cores.painel,
  },
  pressionado: {
    backgroundColor: cores.dourado,
  },
  inativo: {
    borderColor: cores.desativado,
  },
  titulo: {
    fontFamily: fontes.titulo,
    fontSize: 18,
    color: cores.douradoClaro,
    letterSpacing: 1,
  },
  textoInativo: {
    color: cores.desativado,
  },
  detalhe: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    marginTop: 2,
  },
});
