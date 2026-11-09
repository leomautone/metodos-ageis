import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cabecalho } from '@/components/Cabecalho';
import { HabitatTag, NOME_HABITAT } from '@/components/HabitatTag';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { formatarPoder, normalizar } from '@/data/formatar';
import { PERSONAGENS, type Habitat } from '@/data/personagens';
import { cores, fontes } from '@/theme';

const FILTROS: (Habitat | null)[] = [null, 'terra', 'agua', 'ar'];

// Consulta de personagens (SCRUM-40): busca por nome ou código, filtro por habitat e leitura de QR.
export default function ListaPersonagens() {
  const [busca, setBusca] = useState('');
  const [habitat, setHabitat] = useState<Habitat | null>(null);
  const { bottom } = useSafeAreaInsets();

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim());
    return PERSONAGENS.filter(
      (p) =>
        (!habitat || p.habitats.includes(habitat)) &&
        (!termo || normalizar(p.nome).includes(termo) || normalizar(p.codigo).includes(termo)),
    );
  }, [busca, habitat]);

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Personagens" subtitulo={`Tema Animais · ${PERSONAGENS.length}`} />

      <View style={styles.topo}>
        <View style={styles.buscaLinha}>
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por nome ou código"
            placeholderTextColor={cores.textoSuave}
            style={styles.busca}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <Pressable
            onPress={() => router.push('/personagens/ler')}
            accessibilityRole="button"
            accessibilityLabel="Ler QR da carta"
            style={({ pressed }) => [styles.qr, pressed && styles.qrPressionado]}
          >
            <Text style={styles.qrTexto}>QR</Text>
          </Pressable>
        </View>

        <View style={styles.filtros}>
          {FILTROS.map((h) => {
            const ativo = habitat === h;
            const cor = h ? cores.habitat[h] : cores.dourado;
            return (
              <Pressable
                key={h ?? 'todos'}
                onPress={() => setHabitat(h)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                style={[styles.filtro, { borderColor: cor }, ativo && { backgroundColor: cor }]}
              >
                <Text style={[styles.filtroTexto, ativo && { color: cores.fundo }]}>
                  {h ? NOME_HABITAT[h] : 'Todos'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={lista}
        keyExtractor={(p) => p.codigo}
        contentContainerStyle={[styles.conteudo, { paddingBottom: bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.vazio}>Nenhum personagem encontrado.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/personagens/[codigo]', params: { codigo: item.codigo } })}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressionado]}
          >
            <ImagemPersonagem codigo={item.codigo} style={styles.imagem} />
            <View style={styles.itemTexto}>
              <Text style={styles.nome} numberOfLines={1}>
                {item.nome}
              </Text>
              <View style={styles.detalhes}>
                <Text style={styles.codigo}>{item.codigo}</Text>
                {item.habitats.map((h) => (
                  <HabitatTag key={h} habitat={h} />
                ))}
                {item.lendario ? (
                  <View style={styles.lendario}>
                    <Text style={styles.lendarioTexto}>LENDÁRIO</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.poderCaixa}>
              <Text style={styles.poder}>{formatarPoder(item.poder)}</Text>
              <Text style={styles.poderRotulo}>PODER</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  topo: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 14,
  },
  buscaLinha: {
    flexDirection: 'row',
    gap: 8,
  },
  busca: {
    flex: 1,
    height: 44,
    backgroundColor: cores.painel,
    borderColor: cores.douradoEscuro,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 18,
    color: cores.texto,
    fontFamily: fontes.texto,
    fontSize: 14,
  },
  qr: {
    width: 52,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cores.dourado,
    backgroundColor: cores.painel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPressionado: {
    backgroundColor: cores.painelClaro,
  },
  qrTexto: {
    fontFamily: fontes.numeroForte,
    fontSize: 16,
    color: cores.douradoClaro,
  },
  filtros: {
    flexDirection: 'row',
    gap: 8,
  },
  filtro: {
    height: 32,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderRadius: 16,
    backgroundColor: cores.painel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtroTexto: {
    fontFamily: fontes.textoForte,
    fontSize: 13,
    color: cores.texto,
  },
  conteudo: {
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 68,
    padding: 8,
    paddingRight: 10,
    backgroundColor: cores.painel,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: cores.painel,
  },
  itemPressionado: {
    borderColor: cores.dourado,
  },
  imagem: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  itemTexto: {
    flex: 1,
    gap: 8,
  },
  nome: {
    fontFamily: fontes.titulo,
    fontSize: 14,
    color: cores.douradoClaro,
  },
  detalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codigo: {
    fontFamily: fontes.numero,
    fontSize: 12,
    letterSpacing: 0.48,
    color: cores.textoSuave,
    marginRight: 9,
  },
  lendario: {
    height: 18,
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: cores.douradoEscuro,
    justifyContent: 'center',
    marginLeft: 4,
  },
  lendarioTexto: {
    fontFamily: fontes.numero,
    fontSize: 10,
    letterSpacing: 0.6,
    color: cores.douradoClaro,
  },
  poderCaixa: {
    alignItems: 'flex-end',
  },
  poder: {
    fontFamily: fontes.numeroForte,
    fontSize: 24,
    lineHeight: 30,
    color: cores.dourado,
  },
  poderRotulo: {
    fontFamily: fontes.numero,
    fontSize: 10,
    letterSpacing: 0.8,
    color: cores.textoSuave,
  },
  vazio: {
    fontFamily: fontes.texto,
    color: cores.textoSuave,
    textAlign: 'center',
    marginTop: 32,
  },
});
