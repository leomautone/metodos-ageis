import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { vagas } from '@/partida/leilao';
import { formatarReais, TAMANHO_TIME, type Jogador } from '@/partida/partida';
import { cores, fontes } from '@/theme';

type Props = {
  jogadores: Jogador[];
  selecionado?: number | null;
  // Sem onSelecionar, a grade só mostra saldo e vagas.
  onSelecionar?: (j: Jogador) => void;
};

// Jogadores com saldo e vagas (pontos cheios = vagas livres no time).
// Quem está com o time completo não pode ser escolhido.
export function GradeJogadores({ jogadores, selecionado, onSelecionar }: Props) {
  return (
    <View style={styles.grade}>
      {jogadores.map((j) => {
        const livres = vagas(j);
        const ativo = j.id === selecionado;
        const bloqueado = !!onSelecionar && livres === 0;
        return (
          <Pressable
            key={j.id}
            disabled={!onSelecionar || bloqueado}
            onPress={() => onSelecionar?.(j)}
            accessibilityRole={onSelecionar ? 'button' : undefined}
            accessibilityState={{ selected: ativo, disabled: bloqueado }}
            style={[styles.jogador, ativo && styles.ativo, bloqueado && styles.bloqueado]}
          >
            <Avatar jogadorId={j.id} texto={j.nome.charAt(0).toUpperCase()} tamanho={34} />
            <View style={styles.texto}>
              <Text style={styles.nome} numberOfLines={1}>
                {j.nome}
              </Text>
              <View style={styles.saldoLinha}>
                <Text style={styles.saldo}>{formatarReais(j.saldo)}</Text>
                <View style={styles.pontos} accessibilityLabel={`${livres} vagas`}>
                  {Array.from({ length: TAMANHO_TIME }, (_, i) => (
                    <View key={i} style={[styles.ponto, i < livres && styles.pontoCheio]} />
                  ))}
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  jogador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48.8%',
    flexGrow: 1,
    height: 62,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.douradoEscuro,
    backgroundColor: cores.painel,
  },
  ativo: {
    borderWidth: 2,
    borderColor: cores.dourado,
    backgroundColor: cores.painelClaro,
  },
  bloqueado: {
    opacity: 0.45,
  },
  texto: {
    flex: 1,
  },
  nome: {
    fontFamily: fontes.textoMedio,
    fontSize: 15,
    color: cores.texto,
  },
  saldoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saldo: {
    fontFamily: fontes.numeroForte,
    fontSize: 15,
    color: cores.dourado,
  },
  pontos: {
    flexDirection: 'row',
    gap: 4,
  },
  ponto: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: cores.painelClaro,
  },
  pontoCheio: {
    backgroundColor: cores.douradoClaro,
  },
});
