import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Cabecalho } from '@/components/Cabecalho';
import { Rotulo } from '@/components/Rotulo';
import {
  criarPartida,
  formatarReais,
  MAX_JOGADORES,
  MIN_JOGADORES,
  SALDO_INICIAL,
  salvarPartida,
  TAMANHO_TIME,
} from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Nova partida (SCRUM-19): 3 a 5 jogadores com nome e sorteio dos personagens.
export default function NovaPartida() {
  const [nomes, setNomes] = useState<string[]>(['', '', '']);
  const { bottom } = useSafeAreaInsets();

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

  function sortearEComecar() {
    salvarPartida(criarPartida(limpos));
    router.replace('/partida/leilao');
  }

  const totalPersonagens = nomes.length * TAMANHO_TIME;

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Cabecalho titulo="Nova partida" subtitulo="Tema Animais" />

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={styles.secao}>
          <Rotulo style={styles.rotuloSecao}>Jogadores</Rotulo>
          <Text style={styles.faixa}>
            {MIN_JOGADORES} a {MAX_JOGADORES}
          </Text>
        </View>

        {nomes.map((nome, i) => (
          <View key={i} style={[styles.jogador, repetidos.has(limpos[i]) && styles.jogadorErro]}>
            <Avatar jogadorId={i + 1} texto={String(i + 1)} />
            <TextInput
              value={nome}
              onChangeText={(t) => mudarNome(i, t)}
              placeholder={`Jogador ${i + 1}`}
              placeholderTextColor={cores.textoApagado}
              style={styles.campo}
              maxLength={16}
              returnKeyType="next"
            />
            {nomes.length > MIN_JOGADORES ? (
              <Pressable
                onPress={() => setNomes((atual) => atual.filter((_, j) => j !== i))}
                accessibilityRole="button"
                accessibilityLabel={`Remover jogador ${i + 1}`}
                hitSlop={10}
              >
                <Text style={styles.remover}>×</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        {nomes.length < MAX_JOGADORES ? (
          <Pressable
            onPress={() => setNomes((atual) => [...atual, ''])}
            accessibilityRole="button"
            style={({ pressed }) => [styles.adicionar, pressed && styles.adicionarPressionado]}
          >
            <Text style={styles.adicionarTexto}>+  Adicionar jogador</Text>
          </Pressable>
        ) : null}

        <View style={styles.regras}>
          <Rotulo>Como a partida começa</Rotulo>
          <View style={styles.regra}>
            <Text style={styles.regraValor}>{formatarReais(SALDO_INICIAL)}</Text>
            <Text style={styles.regraTexto}>para cada jogador</Text>
          </View>
          <View style={styles.regra}>
            <Text style={styles.regraValor}>{TAMANHO_TIME} vagas</Text>
            <Text style={styles.regraTexto}>no time de cada um</Text>
          </View>
          <View style={styles.regra}>
            <Text style={styles.regraValor}>{totalPersonagens}</Text>
            <Text style={styles.regraTexto}>
              personagens sorteados ({nomes.length} × {TAMANHO_TIME})
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: bottom + 16 }]}>
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        <Botao titulo="Sortear e começar" onPress={sortearEComecar} desativado={!!erro} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 10,
  },
  secao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  rotuloSecao: {
    fontSize: 13,
    letterSpacing: 1.04,
  },
  faixa: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
  },
  jogador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 54,
    paddingLeft: 12,
    paddingRight: 16,
    backgroundColor: cores.painel,
    borderColor: cores.douradoEscuro,
    borderWidth: 1,
    borderRadius: 12,
  },
  jogadorErro: {
    borderColor: cores.erro,
  },
  campo: {
    flex: 1,
    height: '100%',
    color: cores.texto,
    fontFamily: fontes.textoMedio,
    fontSize: 16,
  },
  remover: {
    fontFamily: fontes.texto,
    fontSize: 22,
    color: cores.textoSuave,
  },
  adicionar: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: cores.dourado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adicionarPressionado: {
    backgroundColor: cores.painel,
  },
  adicionarTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 15,
    color: cores.douradoClaro,
  },
  regras: {
    backgroundColor: cores.painelClaro,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 2,
    marginTop: 14,
  },
  regra: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regraValor: {
    width: 86,
    fontFamily: fontes.numeroForte,
    fontSize: 20,
    color: cores.dourado,
  },
  regraTexto: {
    flex: 1,
    fontFamily: fontes.texto,
    fontSize: 14,
    color: cores.texto,
  },
  rodape: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 8,
  },
  erro: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.erro,
    textAlign: 'center',
  },
});
