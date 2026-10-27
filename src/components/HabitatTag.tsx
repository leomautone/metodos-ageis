import { StyleSheet, Text, View } from 'react-native';

import type { Habitat } from '@/data/personagens';
import { cores, fontes } from '@/theme';

export const SIGLA_HABITAT: Record<Habitat, string> = { terra: 'T', agua: 'A', ar: 'AR' };
export const NOME_HABITAT: Record<Habitat, string> = { terra: 'Terra', agua: 'Água', ar: 'Ar' };

type Props = {
  habitat: Habitat;
  // Mostra o nome por extenso ao lado da sigla.
  comNome?: boolean;
};

// Ícone redondo com a sigla do habitat, na cor das cartas.
export function HabitatTag({ habitat, comNome }: Props) {
  return (
    <View style={styles.linha}>
      <View style={[styles.circulo, { backgroundColor: cores.habitat[habitat] }]}>
        <Text style={styles.sigla}>{SIGLA_HABITAT[habitat]}</Text>
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
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigla: {
    fontFamily: fontes.numero,
    fontSize: 11,
    color: cores.fundo,
  },
  nome: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.texto,
  },
});
