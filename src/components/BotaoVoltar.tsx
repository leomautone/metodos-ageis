import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { voltar } from '@/components/Cabecalho';
import { cores, fontes } from '@/theme';

// Botão redondo de voltar, flutuando no canto das telas sem cabeçalho (Detalhe, Resultado).
export function BotaoVoltar({ onPress = voltar }: { onPress?: () => void }) {
  const { top } = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={[styles.botao, { top: top + 8 }]}
      hitSlop={8}
    >
      <Text style={styles.seta}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(21,19,28,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  seta: {
    fontFamily: fontes.texto,
    fontSize: 30,
    lineHeight: 34,
    color: cores.douradoClaro,
    marginTop: -2,
  },
});
