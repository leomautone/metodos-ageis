import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { efeitoHabilidade, nomeHabilidade } from '@/batalha/narracao';
import { Cabecalho } from '@/components/Cabecalho';
import { HabitatTag } from '@/components/HabitatTag';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { Painel } from '@/components/Painel';
import { Rotulo } from '@/components/Rotulo';
import { formatarPoder } from '@/data/formatar';
import { buscarPersonagem } from '@/data/personagens';
import { cores, fontes } from '@/theme';

const ATRIBUTOS = [
  ['ataque', 'Ataque'],
  ['durabilidade', 'Durabilidade'],
  ['velocidade', 'Velocidade'],
  ['inteligencia', 'Inteligência'],
] as const;

// Detalhe do personagem: ilustração, atributos, Poder, habilidade e marca de Lendário.
export default function DetalhePersonagem() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const p = buscarPersonagem(codigo ?? '');
  const { top, bottom } = useSafeAreaInsets();

  if (!p) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Personagem" />
        <Text style={[styles.descricao, styles.margem]}>Personagem {codigo} não encontrado.</Text>
      </View>
    );
  }

  const temNome = p.habilidade ? p.habilidade.texto.includes(':') : false;

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottom + 32 }}>
        <View style={styles.hero}>
          <ImagemPersonagem codigo={p.codigo} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(21,19,28,0)', cores.fundo]} style={styles.degrade} />
        </View>

        <View style={styles.margem}>
          <View style={styles.titulo}>
            <View style={styles.flex}>
              <Text style={styles.nome}>{p.nome}</Text>
              <View style={styles.linha}>
                <Text style={styles.codigo}>{p.codigo}</Text>
                {p.habitats.map((h) => (
                  <HabitatTag key={h} habitat={h} tamanho={24} comNome />
                ))}
              </View>
              {p.lendario ? (
                <View style={styles.lendario}>
                  <Text style={styles.lendarioTexto}>LENDÁRIO</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.poderCaixa}>
              <Text style={styles.poder}>{formatarPoder(p.poder)}</Text>
              <Text style={styles.poderRotulo}>PODER</Text>
            </View>
          </View>

          <View style={styles.atributos}>
            {ATRIBUTOS.map(([chave, rotulo]) => (
              <View key={chave} style={styles.atributo}>
                <Text style={styles.atributoNome}>{rotulo}</Text>
                <View style={styles.barraFundo}>
                  <View style={[styles.barra, { width: `${p[chave] * 10}%` }]} />
                </View>
                <Text style={styles.atributoValor}>{p[chave]}</Text>
              </View>
            ))}
          </View>

          <Painel style={styles.habilidade}>
            <Rotulo>Habilidade</Rotulo>
            {p.habilidade ? (
              <>
                {temNome ? <Text style={styles.habilidadeNome}>{nomeHabilidade(p.habilidade.texto)}</Text> : null}
                <Text style={styles.habilidadeTexto}>{efeitoHabilidade(p.habilidade.texto)}</Text>
              </>
            ) : (
              <>
                <Text style={styles.habilidadeNome}>Lendário</Text>
                <Text style={styles.habilidadeTexto}>Lendários não têm habilidade.</Text>
              </>
            )}
          </Painel>

          <Text style={styles.descricao}>“{p.descricao}”</Text>
          <Text style={styles.fonte}>Texto da carta impressa</Text>
        </View>
      </ScrollView>

      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={[styles.voltar, { top: top + 8 }]}
        hitSlop={8}
      >
        <Text style={styles.seta}>‹</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  flex: {
    flex: 1,
  },
  hero: {
    height: 310,
  },
  degrade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  voltar: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(21,19,28,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seta: {
    fontFamily: fontes.texto,
    fontSize: 30,
    lineHeight: 34,
    color: cores.douradoClaro,
    marginTop: -2,
  },
  margem: {
    paddingHorizontal: 24,
  },
  titulo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: -16,
  },
  nome: {
    fontFamily: fontes.titulo,
    fontSize: 24,
    color: cores.douradoClaro,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  codigo: {
    fontFamily: fontes.numero,
    fontSize: 14,
    letterSpacing: 0.84,
    color: cores.textoSuave,
    marginRight: 8,
  },
  lendario: {
    alignSelf: 'flex-start',
    height: 20,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: cores.douradoEscuro,
    justifyContent: 'center',
    marginTop: 8,
  },
  lendarioTexto: {
    fontFamily: fontes.numero,
    fontSize: 11,
    letterSpacing: 0.66,
    color: cores.douradoClaro,
  },
  poderCaixa: {
    alignItems: 'flex-end',
    marginTop: -12,
  },
  poder: {
    fontFamily: fontes.numeroForte,
    fontSize: 48,
    lineHeight: 60,
    color: cores.dourado,
  },
  poderRotulo: {
    fontFamily: fontes.numero,
    fontSize: 11,
    letterSpacing: 0.88,
    color: cores.textoSuave,
    marginTop: -6,
  },
  atributos: {
    gap: 21,
    marginTop: 28,
  },
  atributo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  atributoNome: {
    width: 116,
    fontFamily: fontes.textoMedio,
    fontSize: 14,
    color: cores.texto,
  },
  barraFundo: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: cores.painelClaro,
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: cores.dourado,
  },
  atributoValor: {
    width: 36,
    fontFamily: fontes.numeroForte,
    fontSize: 16,
    color: cores.douradoClaro,
    textAlign: 'right',
  },
  habilidade: {
    marginTop: 36,
    gap: 4,
  },
  habilidadeNome: {
    fontFamily: fontes.titulo,
    fontSize: 18,
    color: cores.douradoClaro,
  },
  habilidadeTexto: {
    fontFamily: fontes.texto,
    fontSize: 14,
    color: cores.texto,
  },
  descricao: {
    fontFamily: fontes.textoItalico,
    fontSize: 14,
    lineHeight: 21,
    color: cores.textoSuave,
    marginTop: 24,
  },
  fonte: {
    fontFamily: fontes.texto,
    fontSize: 11,
    color: cores.textoApagado,
    marginTop: 28,
  },
});
