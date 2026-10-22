import { StyleSheet, View, type ViewProps } from 'react-native';

import { cores } from '@/theme';

// Painel com borda dourada e ornamentos nos quatro cantos, como nas cartas.
export function Painel({ style, children, ...props }: ViewProps) {
  return (
    <View style={[styles.painel, style]} {...props}>
      <View style={[styles.canto, styles.supEsq]} />
      <View style={[styles.canto, styles.supDir]} />
      <View style={[styles.canto, styles.infEsq]} />
      <View style={[styles.canto, styles.infDir]} />
      {children}
    </View>
  );
}

const TAMANHO = 14;

const styles = StyleSheet.create({
  painel: {
    backgroundColor: cores.painel,
    borderColor: cores.dourado,
    borderWidth: 1,
    borderRadius: 6,
    padding: 16,
  },
  canto: {
    position: 'absolute',
    width: TAMANHO,
    height: TAMANHO,
    borderColor: cores.douradoClaro,
  },
  supEsq: { top: 4, left: 4, borderTopWidth: 2, borderLeftWidth: 2 },
  supDir: { top: 4, right: 4, borderTopWidth: 2, borderRightWidth: 2 },
  infEsq: { bottom: 4, left: 4, borderBottomWidth: 2, borderLeftWidth: 2 },
  infDir: { bottom: 4, right: 4, borderBottomWidth: 2, borderRightWidth: 2 },
});
