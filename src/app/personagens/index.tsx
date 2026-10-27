import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { HabitatTag, NOME_HABITAT } from '@/components/HabitatTag';
import { PERSONAGENS, type Habitat } from '@/data/personagens';
import { cores, fontes } from '@/theme';

const FILTROS: (Habitat | null)[] = [null, 'terra', 'agua', 'ar'];

// Remove acentos para a busca achar "agua" em "Água", por exemplo.
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Consulta de personagens (SCRUM-40): busca por nome ou código e filtro por habitat.
export default function ListaPersonagens() {
  const [busca, setBusca] = useState('');
  const [habitat, setHabitat] = useState<Habitat | null>(null);

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
      <TextInput
        value={busca}
        onChangeText={setBusca}
        placeholder="Buscar por nome ou código"
        placeholderTextColor={cores.textoSuave}
        style={styles.busca}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <View style={styles.filtros}>
        {FILTROS.map((h) => {
          const ativo = habitat === h;
          return (
            <Pressable
              key={h ?? 'todos'}
              onPress={() => setHabitat(h)}
              style={[
                styles.filtro,
                ativo && { backgroundColor: h ? cores.habitat[h] : cores.dourado },
              ]}
            >
              <Text style={[styles.filtroTexto, ativo && { color: cores.fundo }]}>
                {h ? NOME_HABITAT[h] : 'Todos'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={lista}
        keyExtractor={(p) => p.codigo}
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.vazio}>Nenhum personagem encontrado.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/personagens/[codigo]', params: { codigo: item.codigo } })}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressionado]}
          >
            <View style={styles.itemTexto}>
              <Text style={styles.codigo}>{item.codigo}</Text>
              <Text style={styles.nome}>
                {item.nome}
                {item.lendario ? <Text style={styles.lendario}>  ★</Text> : null}
              </Text>
            </View>
            <View style={styles.habitats}>
              {item.habitats.map((h) => (
                <HabitatTag key={h} habitat={h} />
              ))}
            </View>
            <Text style={styles.poder}>{item.poder.toFixed(1)}</Text>
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  busca: {
    backgroundColor: cores.painel,
    borderColor: cores.dourado,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: cores.texto,
    fontFamily: fontes.texto,
    fontSize: 15,
  },
  filtros: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  filtro: {
    flex: 1,
    borderColor: cores.dourado,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  filtroTexto: {
    fontFamily: fontes.textoForte,
    fontSize: 13,
    color: cores.texto,
  },
  conteudo: {
    gap: 8,
    paddingBottom: 32,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: cores.painel,
    borderColor: cores.desativado,
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  itemPressionado: {
    borderColor: cores.dourado,
  },
  itemTexto: {
    flex: 1,
  },
  codigo: {
    fontFamily: fontes.numero,
    fontSize: 12,
    color: cores.dourado,
  },
  nome: {
    fontFamily: fontes.titulo,
    fontSize: 15,
    color: cores.texto,
  },
  lendario: {
    color: cores.douradoClaro,
  },
  habitats: {
    flexDirection: 'row',
    gap: 4,
  },
  poder: {
    fontFamily: fontes.numero,
    fontSize: 18,
    color: cores.douradoClaro,
    minWidth: 32,
    textAlign: 'right',
  },
  vazio: {
    fontFamily: fontes.texto,
    color: cores.textoSuave,
    textAlign: 'center',
    marginTop: 32,
  },
});
