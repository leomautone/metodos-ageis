import { StyleSheet, Text, View } from 'react-native';

import type { Habitat } from '@/data/personagens';
import { cores, fontes } from '@/theme';

export const SIGLA_HABITAT: Record<Habitat, string> = { terra: 'T', agua: 'A', ar: 'AR' };
export const NOME_HABITAT: Record<Habitat, string> = { terra: 'Terra', agua: 'Água', ar: 'Ar' };

type Props = {
  habitat: Habitat;
  // 20 nas listas, 24 no detalhe e no leilão.
  tamanho?: number;
  // Mostra o nome por extenso ao lado da sigla.
  comNome?: boolean;
};

// Ícone redondo com a sigla do habitat, na cor das cartas e com contorno dourado.
export function HabitatTag({ habitat, tamanho = 20, comNome }: Props) {
  const sigla = SIGLA_HABITAT[habitat];
  return (
    <View style={styles.linha}>
      <View
        style={[
          styles.circulo,
          {
            width: tamanho,
            height: tamanho,
            borderRadius: tamanho / 2,
            backgroundColor: cores.habitat[habitat],
          },
        ]}
      >
        <Text style={[styles.sigla, { fontSize: tamanho * (sigla.length > 1 ? 0.36 : 0.5) }]}>{sigla}</Text>
      </View>
      {comNome ? <Text style={styles.nome}>{NOME_HABITAT[habitat]}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  circulo: {
    borderWidth: 1.5,
    borderColor: cores.dourado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigla: {
    fontFamily: fontes.numeroForte,
    color: cores.fundo,
    includeFontPadding: false,
  },
  nome: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.texto,
  },
});
