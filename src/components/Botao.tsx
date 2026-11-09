import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { cores, fontes } from '@/theme';

type Props = {
  titulo: string;
  onPress?: () => void;
  // primario = dourado cheio; secundario = contorno dourado.
  variante?: 'primario' | 'secundario';
  desativado?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Botao({ titulo, onPress, variante = 'primario', desativado, style }: Props) {
  const inativo = desativado || !onPress;
  const primario = variante === 'primario';
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo }}
      style={({ pressed }) => [
        styles.botao,
        primario ? styles.primario : styles.secundario,
        pressed && (primario ? styles.primarioPressionado : styles.secundarioPressionado),
        inativo && styles.inativo,
        style,
      ]}
    >
      <Text
        style={[styles.titulo, { color: primario ? cores.fundo : cores.douradoClaro }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primario: {
    backgroundColor: cores.dourado,
    borderColor: cores.douradoClaro,
    borderWidth: 1,
  },
  secundario: {
    backgroundColor: cores.painel,
    borderColor: cores.dourado,
    borderWidth: 1.5,
  },
  primarioPressionado: {
    backgroundColor: cores.douradoClaro,
  },
  secundarioPressionado: {
    backgroundColor: cores.painelClaro,
  },
  inativo: {
    opacity: 0.4,
  },
  titulo: {
    fontFamily: fontes.numeroForte,
    fontSize: 17,
    letterSpacing: 1.02,
    textTransform: 'uppercase',
  },
});
