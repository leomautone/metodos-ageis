import { usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Cabecalho, voltar } from '@/components/Cabecalho';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { LeitorQR } from '@/components/LeitorQR';
import { normalizarCodigo } from '@/data/formatar';
import { buscarPersonagem } from '@/data/personagens';
import { aplicarVenda } from '@/partida/leilao';
import { buscarJogador, formatarReais, obterPartida, salvarPartida, usePartida } from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Registro por QR (SCRUM-20): quem levou o personagem escaneia a carta,
// o app confere o código, põe no time e desconta o valor.
export default function RegistrarCarta() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [lido, setLido] = useState<string | null>(null);
  const [digitando, setDigitando] = useState(false);
  const [texto, setTexto] = useState('');
  // Sair sem confirmar (setinha ou botão voltar do Android) pede confirmação
  // e desfaz a venda: o personagem volta para o leilão e ninguém paga nada.
  const liberarSaida = usePreventRemove(!!partida?.pendente, ({ repeat }) => {
    Alert.alert('Desfazer a venda?', 'O personagem volta para o leilão e ninguém paga nada.', [
      { text: 'Continuar registrando', style: 'cancel' },
      {
        text: 'Desfazer venda',
        style: 'destructive',
        onPress: () => {
          const atual = obterPartida();
          if (atual) salvarPartida({ ...atual, pendente: null });
          repeat();
        },
      },
    ]);
  });

  const venda = partida?.pendente;
  if (!partida || !venda) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Registrar carta" />
        <Text style={[styles.status, styles.margem]}>Nenhuma carta para registrar.</Text>
      </View>
    );
  }

  const p = buscarPersonagem(venda.codigo)!;
  const jogador = buscarJogador(partida, venda.jogadorId)!;
  const reconhecida = lido === venda.codigo;
  const outra = lido && !reconhecida ? buscarPersonagem(lido) : null;

  function confirmar() {
    if (!partida || !venda) return;
    salvarPartida(aplicarVenda(partida, venda));
    liberarSaida();
    voltar();
  }

  function conferirDigitado(valor: string) {
    setTexto(valor);
    if (valor.trim().length >= 2) setLido(normalizarCodigo(valor));
  }

  const dados = venda.dados
    ? Object.entries(venda.dados)
        .map(([id, valores]) => `${buscarJogador(partida, Number(id))?.nome} ${valores.join('→')}`)
        .join(' · ')
    : null;

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Cabecalho
        titulo="Registrar carta"
        subtitulo={venda.tipo === 'obrigatorio' ? 'Repescagem cheia' : 'Vendido!'}
      />

      <ScrollView contentContainerStyle={styles.rolagem} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={styles.cameraArea}>
          <LeitorQR
            onLer={(t) => setLido(normalizarCodigo(t))}
            pausado={reconhecida}
            style={styles.camera}
            fundo={<ImagemPersonagem codigo={venda.codigo} style={styles.cartaFantasma} />}
          />
          <Text style={styles.instrucao}>Aponte a câmera para o QR da carta</Text>
        </View>

        <View style={[styles.folha, { paddingBottom: bottom + 16 }]}>
          <View style={styles.alca} />

          <View style={styles.statusLinha}>
            <View style={[styles.selo, reconhecida ? styles.seloOk : outra || lido ? styles.seloErro : null]}>
              <Text style={styles.seloTexto}>{reconhecida ? '✓' : lido ? '!' : '?'}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.status}>
                {reconhecida
                  ? 'Carta reconhecida'
                  : lido
                    ? `Carta errada: ${outra ? `${lido} · ${outra.nome}` : lido}`
                    : 'Esperando a carta'}
              </Text>
              <Text style={styles.cartaNome} numberOfLines={1}>
                {p.codigo} · {p.nome}
              </Text>
            </View>
          </View>

          <View style={styles.compra}>
            <Avatar jogadorId={jogador.id} texto={jogador.nome.charAt(0).toUpperCase()} />
            <View style={styles.flex}>
              <Text style={styles.compraRotulo}>{jogador.nome} leva por</Text>
              <Text style={styles.compraValor}>{formatarReais(venda.valor)}</Text>
            </View>
            <Text style={styles.compraSaldo}>
              Saldo: {formatarReais(jogador.saldo)} → {formatarReais(jogador.saldo - venda.valor)}
            </Text>
          </View>

          {dados ? <Text style={styles.dados}>Desempate no dado, o menor fica: {dados}</Text> : null}

          <Botao titulo="Confirmar" onPress={confirmar} desativado={!reconhecida} />

          {digitando ? (
            <TextInput
              value={texto}
              onChangeText={conferirDigitado}
              placeholder="Código da carta, ex.: ANI-011"
              placeholderTextColor={cores.textoApagado}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              style={styles.campo}
            />
          ) : (
            <Pressable onPress={() => setDigitando(true)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>QR não leu? Digitar o código</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  margem: {
    padding: 24,
  },
  rolagem: {
    flexGrow: 1,
    paddingTop: 16,
  },
  cameraArea: {
    flex: 1,
    minHeight: 360,
    backgroundColor: cores.camera,
  },
  camera: {
    flex: 1,
  },
  cartaFantasma: {
    width: 200,
    height: 300,
    borderRadius: 8,
    opacity: 0.35,
  },
  instrucao: {
    fontFamily: fontes.textoMedio,
    fontSize: 14,
    color: cores.texto,
    textAlign: 'center',
    paddingVertical: 14,
  },
  folha: {
    backgroundColor: cores.painel,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
  },
  alca: {
    alignSelf: 'center',
    width: 50,
    height: 5,
    borderRadius: 3,
    backgroundColor: cores.painelClaro,
    marginBottom: 6,
  },
  statusLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.painelClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seloOk: {
    backgroundColor: cores.sucesso,
  },
  seloErro: {
    backgroundColor: cores.erro,
  },
  seloTexto: {
    fontFamily: fontes.numeroForte,
    fontSize: 18,
    color: cores.fundo,
  },
  status: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.textoSuave,
  },
  cartaNome: {
    fontFamily: fontes.titulo,
    fontSize: 16,
    color: cores.douradoClaro,
  },
  compra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: cores.painelClaro,
  },
  compraRotulo: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
  },
  compraValor: {
    fontFamily: fontes.numeroForte,
    fontSize: 20,
    color: cores.dourado,
  },
  compraSaldo: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.texto,
  },
  dados: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  link: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
  campo: {
    height: 44,
    backgroundColor: cores.fundo,
    borderColor: cores.douradoEscuro,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    color: cores.texto,
    fontFamily: fontes.numero,
    fontSize: 16,
    letterSpacing: 1,
  },
});
