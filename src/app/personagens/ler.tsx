import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Cabecalho } from '@/components/Cabecalho';
import { LeitorQR } from '@/components/LeitorQR';
import { buscarPersonagem } from '@/data/personagens';
import { cores, fontes } from '@/theme';

// Consulta pelo QR da carta: lê o código e abre o detalhe do personagem.
export default function LerCarta() {
  const [erro, setErro] = useState<string | null>(null);

  function ler(texto: string) {
    const codigo = texto.trim().toUpperCase();
    if (!buscarPersonagem(codigo)) {
      setErro(`"${texto}" não é uma carta do tema Animais.`);
      return;
    }
    router.replace({ pathname: '/personagens/[codigo]', params: { codigo } });
  }

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Ler carta" subtitulo="Consulta pelo QR" />
      <LeitorQR onLer={ler} style={styles.camera} />
      <Text style={[styles.instrucao, erro ? styles.erro : null]}>
        {erro ?? 'Aponte a câmera para o QR da carta'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  camera: {
    height: 420,
    marginTop: 16,
  },
  instrucao: {
    fontFamily: fontes.textoMedio,
    fontSize: 14,
    color: cores.texto,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  erro: {
    color: cores.erro,
  },
});
