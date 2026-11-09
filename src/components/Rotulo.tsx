import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { cores, fontes } from '@/theme';

// Rótulo pequeno em caixa alta, ex.: "TEMA DA PARTIDA", "JOGADORES".
export function Rotulo({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.rotulo, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  rotulo: {
    fontFamily: fontes.numero,
    fontSize: 12,
    color: cores.textoSuave,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
});
