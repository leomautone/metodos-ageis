import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HabitatTag } from '@/components/HabitatTag';
import { Painel } from '@/components/Painel';
import { buscarPersonagem } from '@/data/personagens';
import { cores, fontes } from '@/theme';

const ATRIBUTOS = [
  ['ataque', 'Ataque'],
  ['durabilidade', 'Durabilidade'],
  ['velocidade', 'Velocidade'],
  ['inteligencia', 'Inteligência'],
] as const;

// Detalhe do personagem: atributos, Poder, habilidade e marca de Lendário.
export default function DetalhePersonagem() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const p = buscarPersonagem(codigo ?? '');

  if (!p) {
    return (
      <View style={styles.tela}>
        <Stack.Screen options={{ title: 'Personagem' }} />
        <Text style={styles.texto}>Personagem {codigo} não encontrado.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Stack.Screen options={{ title: p.codigo }} />

      <Painel style={styles.cabecalho}>
        <Text style={styles.codigo}>{p.codigo}</Text>
        <Text style={styles.nome}>{p.nome}</Text>
        {p.lendario ? <Text style={styles.lendario}>★ LENDÁRIO ★</Text> : null}
        <View style={styles.habitats}>
          {p.habitats.map((h) => (
            <HabitatTag key={h} habitat={h} comNome />
          ))}
        </View>
        <Text style={styles.poderRotulo}>PODER</Text>
        <Text style={styles.poder}>{p.poder.toFixed(1)}</Text>
      </Painel>

      <Painel style={styles.bloco}>
        <Text style={styles.titulo}>Atributos</Text>
        {ATRIBUTOS.map(([chave, rotulo]) => (
          <View key={chave} style={styles.atributo}>
            <Text style={styles.atributoNome}>{rotulo}</Text>
            <View style={styles.barraFundo}>
              <View style={[styles.barra, { width: `${p[chave] * 10}%` }]} />
            </View>
            <Text style={styles.atributoValor}>{p[chave]}</Text>
          </View>
        ))}
      </Painel>

      <Painel style={styles.bloco}>
        <Text style={styles.titulo}>Habilidade</Text>
        <Text style={styles.texto}>
          {p.habilidade ? p.habilidade.texto : 'Lendários não têm habilidade.'}
        </Text>
      </Painel>

      <Painel style={styles.bloco}>
        <Text style={styles.titulo}>Sobre</Text>
        <Text style={styles.texto}>{p.descricao}</Text>
      </Painel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  cabecalho: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  codigo: {
    fontFamily: fontes.numero,
    fontSize: 14,
    color: cores.dourado,
    letterSpacing: 2,
  },
  nome: {
    fontFamily: fontes.titulo,
    fontSize: 26,
    color: cores.douradoClaro,
    textAlign: 'center',
    marginTop: 4,
  },
  lendario: {
    fontFamily: fontes.titulo,
    fontSize: 13,
    color: cores.dourado,
    letterSpacing: 2,
    marginTop: 6,
  },
  habitats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
  },
  poderRotulo: {
    fontFamily: fontes.textoForte,
    fontSize: 11,
    color: cores.textoSuave,
    letterSpacing: 3,
    marginTop: 18,
  },
  poder: {
    fontFamily: fontes.numero,
    fontSize: 44,
    color: cores.douradoClaro,
  },
  bloco: {
    gap: 10,
  },
  titulo: {
    fontFamily: fontes.titulo,
    fontSize: 16,
    color: cores.dourado,
  },
  atributo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  atributoNome: {
    width: 96,
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.texto,
  },
  barraFundo: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: cores.desativado,
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
    backgroundColor: cores.dourado,
  },
  atributoValor: {
    width: 22,
    fontFamily: fontes.numero,
    fontSize: 15,
    color: cores.douradoClaro,
    textAlign: 'right',
  },
  texto: {
    fontFamily: fontes.texto,
    fontSize: 14,
    lineHeight: 21,
    color: cores.texto,
  },
});
