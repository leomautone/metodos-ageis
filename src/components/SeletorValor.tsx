import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatarReais } from '@/partida/partida';
import { cores, fontes } from '@/theme';

type Props = {
  valor: number;
  // Sem máximo (ninguém escolhido ainda), o + não trava.
  maximo?: number;
  onMudar: (valor: number) => void;
};

// Valor do lance em reais, de R$ 1 em R$ 1, com − e + nas pontas.
export function SeletorValor({ valor, maximo, onMudar }: Props) {
  const noMinimo = valor <= 0;
  const noMaximo = maximo !== undefined && valor >= maximo;
  return (
    <View style={styles.linha}>
      <Pressable
        onPress={() => onMudar(Math.max(0, valor - 1))}
        disabled={noMinimo}
        accessibilityRole="button"
        accessibilityLabel="Diminuir valor"
        style={[styles.passo, noMinimo && styles.inativo]}
      >
        <Text style={styles.passoTexto}>−</Text>
      </Pressable>
      <View style={styles.valor}>
        <Text style={styles.valorTexto}>{formatarReais(valor)}</Text>
      </View>
      <Pressable
        onPress={() => onMudar(valor + 1)}
        disabled={noMaximo}
        accessibilityRole="button"
        accessibilityLabel="Aumentar valor"
        style={[styles.passo, noMaximo && styles.inativo]}
      >
        <Text style={styles.passoTexto}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    gap: 8,
  },
  passo: {
    width: 64,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.dourado,
    backgroundColor: cores.painel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inativo: {
    opacity: 0.4,
  },
  passoTexto: {
    fontFamily: fontes.numeroForte,
    fontSize: 26,
    color: cores.douradoClaro,
  },
  valor: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: cores.painelClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorTexto: {
    fontFamily: fontes.numeroForte,
    fontSize: 26,
    color: cores.douradoClaro,
  },
});
