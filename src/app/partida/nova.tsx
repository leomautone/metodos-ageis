import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { HabitatTag } from '@/components/HabitatTag';
import { Painel } from '@/components/Painel';
import { buscarPersonagem } from '@/data/personagens';
import {
  criarPartida,
  formatarReais,
  MAX_JOGADORES,
  MIN_JOGADORES,
  SALDO_INICIAL,
  salvarPartida,
  usePartida,
} from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Nova partida (SCRUM-19): 3 a 5 jogadores com nome e sorteio dos personagens.
export default function NovaPartida() {
  const partida = usePartida();
  const [nomes, setNomes] = useState<string[]>(['', '', '']);
  const [sorteado, setSorteado] = useState(false);

  const limpos = nomes.map((n) => n.trim());
  const repetidos = new Set(
    limpos.filter((n, i) => n && limpos.findIndex((m) => m.toLowerCase() === n.toLowerCase()) !== i),
  );
  const erro = limpos.some((n) => !n)
    ? 'Preencha o nome de todos os jogadores.'
    : repetidos.size > 0
      ? 'Cada jogador precisa de um nome diferente.'
      : null;

  function mudarNome(i: number, texto: string) {
    setNomes((atual) => atual.map((n, j) => (j === i ? texto : n)));
  }

  function sortear() {
    salvarPartida(criarPartida(limpos));
    setSorteado(true);
  }

  if (sorteado && partida) {
    return (
      <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
        <Painel style={styles.bloco}>
          <Text style={styles.titulo}>Jogadores</Text>
          {partida.jogadores.map((j) => (
            <View key={j.id} style={styles.linha}>
              <Text style={styles.texto}>{j.nome}</Text>
              <Text style={styles.numero}>{formatarReais(j.saldo)}</Text>
            </View>
          ))}
        </Painel>

        <Painel style={styles.bloco}>
          <Text style={styles.titulo}>Ordem do leilão · {partida.fila.length} personagens</Text>
          {partida.fila.map((codigo, i) => {
            const p = buscarPersonagem(codigo)!;
            return (
              <View key={codigo} style={styles.linha}>
                <Text style={styles.ordem}>{i + 1}</Text>
                <Text style={styles.codigo}>{p.codigo}</Text>
                <Text style={[styles.texto, styles.flex]}>{p.nome}</Text>
                <View style={styles.habitats}>
                  {p.habitats.map((h) => (
                    <HabitatTag key={h} habitat={h} />
                  ))}
                </View>
              </View>
            );
          })}
        </Painel>

        <Botao titulo="Sortear de novo" onPress={sortear} />
        <Botao titulo="Trocar jogadores" onPress={() => setSorteado(false)} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
    >
      <Painel style={styles.bloco}>
        <Text style={styles.titulo}>Jogadores ({nomes.length})</Text>
        <Text style={styles.ajuda}>
          De {MIN_JOGADORES} a {MAX_JOGADORES} jogadores. Cada um começa com{' '}
          {formatarReais(SALDO_INICIAL)} e monta um time de 3 personagens.
        </Text>
        {nomes.map((nome, i) => (
          <View key={i} style={styles.linha}>
            <TextInput
              value={nome}
              onChangeText={(t) => mudarNome(i, t)}
              placeholder={`Jogador ${i + 1}`}
              placeholderTextColor={cores.textoSuave}
              style={[styles.campo, repetidos.has(limpos[i]) && styles.campoErro]}
              maxLength={20}
              returnKeyType="next"
            />
            {nomes.length > MIN_JOGADORES ? (
              <Pressable
                onPress={() => setNomes((atual) => atual.filter((_, j) => j !== i))}
                accessibilityLabel={`Remover jogador ${i + 1}`}
                hitSlop={8}
              >
                <Text style={styles.remover}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {nomes.length < MAX_JOGADORES ? (
          <Pressable onPress={() => setNomes((atual) => [...atual, ''])}>
            <Text style={styles.adicionar}>+ Adicionar jogador</Text>
          </Pressable>
        ) : null}
      </Painel>

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <Botao
        titulo="Sortear personagens"
        detalhe={`${nomes.length * 3} personagens entre os 30`}
        onPress={sortear}
        desativado={!!erro}
      />
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
  bloco: {
    gap: 10,
  },
  titulo: {
    fontFamily: fontes.titulo,
    fontSize: 16,
    color: cores.dourado,
  },
  ajuda: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  campo: {
    flex: 1,
    backgroundColor: cores.fundo,
    borderColor: cores.desativado,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: cores.texto,
    fontFamily: fontes.texto,
    fontSize: 15,
  },
  campoErro: {
    borderColor: '#C9503F',
  },
  remover: {
    color: cores.textoSuave,
    fontSize: 18,
    paddingHorizontal: 4,
  },
  adicionar: {
    fontFamily: fontes.textoForte,
    color: cores.douradoClaro,
    paddingVertical: 6,
  },
  erro: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: '#E07A6A',
    textAlign: 'center',
  },
  texto: {
    fontFamily: fontes.texto,
    fontSize: 14,
    color: cores.texto,
    flex: 1,
  },
  numero: {
    fontFamily: fontes.numero,
    fontSize: 15,
    color: cores.douradoClaro,
  },
  ordem: {
    width: 20,
    fontFamily: fontes.numero,
    fontSize: 13,
    color: cores.textoSuave,
    textAlign: 'right',
  },
  codigo: {
    fontFamily: fontes.numero,
    fontSize: 13,
    color: cores.dourado,
  },
  habitats: {
    flexDirection: 'row',
    gap: 4,
  },
});
