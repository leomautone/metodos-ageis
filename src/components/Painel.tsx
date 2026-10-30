import { StyleSheet, View, type ViewProps } from 'react-native';

import { cores } from '@/theme';

// Painel com borda dourada e losangos nos quatro cantos, como nas cartas.
export function Painel({ style, children, ...props }: ViewProps) {
  return (
    <View style={[styles.painel, style]} {...props}>
      {children}
      <View style={[styles.losango, styles.supEsq]} />
      <View style={[styles.losango, styles.supDir]} />
      <View style={[styles.losango, styles.infEsq]} />
      <View style={[styles.losango, styles.infDir]} />
    </View>
  );
}

const LADO = 10;
// Centro do losango exatamente sobre o canto do painel (a borda tem 1,5).
const DESLOCAMENTO = -LADO / 2 - 1.5;

const styles = StyleSheet.create({
  painel: {
    backgroundColor: cores.painel,
    borderColor: cores.dourado,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  losango: {
    position: 'absolute',
    width: LADO,
    height: LADO,
    backgroundColor: cores.dourado,
    transform: [{ rotate: '45deg' }],
  },
  supEsq: { top: DESLOCAMENTO, left: DESLOCAMENTO },
  supDir: { top: DESLOCAMENTO, right: DESLOCAMENTO },
  infEsq: { bottom: DESLOCAMENTO, left: DESLOCAMENTO },
  infDir: { bottom: DESLOCAMENTO, right: DESLOCAMENTO },
});
