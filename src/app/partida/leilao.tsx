import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { Cabecalho } from '@/components/Cabecalho';
import { Cronometro } from '@/components/Cronometro';
import { GradeJogadores } from '@/components/GradeJogadores';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { LeitorQR } from '@/components/LeitorQR';
import { Roleta } from '@/components/Roleta';
import { Rotulo } from '@/components/Rotulo';
import { SeletorValor } from '@/components/SeletorValor';
import { normalizarCodigo } from '@/data/formatar';
import { buscarPersonagem } from '@/data/personagens';
import {
  aplicarVenda,
  cartaSemLance,
  conferirCarta,
  leilaoConcluido,
  MAX_REPESCAGEM,
  podeComprar,
  TEMPO_LEILAO_MS,
  totalLeiloes,
  vendaObrigatoria,
  venderCarta,
} from '@/partida/leilao';
import {
  buscarJogador,
  formatarReais,
  salvarPartida,
  usePartida,
  type Jogador,
  type Venda,
} from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Leilão (SCRUM-21): o leilão acontece na mesa, com cartas e moedas de verdade.
// O app marca 20 s; quando o tempo acaba, registra a carta (QR ou código),
// quem levou e por quanto.
export default function Leilao() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [fase, setFase] = useState<'relogio' | 'registro'>('relogio');
  const [fimEm, setFimEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const [codigo, setCodigo] = useState<string | null>(null);
  const [erroCarta, setErroCarta] = useState<string | null>(null);
  const [digitando, setDigitando] = useState(false);
  const [texto, setTexto] = useState('');
  const [comprador, setComprador] = useState<number | null>(null);
  const [valor, setValor] = useState(0);
  // Sem lance com a repescagem cheia: mostra para quem vai antes de confirmar.
  const [obrigatorio, setObrigatorio] = useState<Venda | null>(null);
  // Sem lance, repescagem cheia e empate em vagas: a roleta decide entre esses jogadores.
  const [roleta, setRoleta] = useState<number[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Atualiza o relógio várias vezes por segundo enquanto ele corre.
  useEffect(() => {
    if (fimEm === null) return;
    const intervalo = setInterval(() => setAgora(Date.now()), 100);
    return () => clearInterval(intervalo);
  }, [fimEm]);

  // Tempo esgotado: passa para o registro.
  useEffect(() => {
    if (fimEm !== null && agora >= fimEm) encerrar();
  });

  const concluido = partida !== null && leilaoConcluido(partida);
  const sobrouRepescagem = (partida?.repescagem.length ?? 0) > 0;
  useEffect(() => {
    if (concluido) router.replace(sobrouRepescagem ? '/partida/repescagem' : '/partida/times');
  }, [concluido, sobrouRepescagem]);

  if (!partida || concluido) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Leilão" />
        {!partida ? (
          <View style={styles.vazio}>
            <Text style={styles.legenda}>Nenhuma partida em andamento.</Text>
            <Botao titulo="Nova partida" onPress={() => router.replace('/partida/nova')} />
          </View>
        ) : null}
      </View>
    );
  }

  const correndo = fimEm !== null;
  const restanteMs = correndo ? Math.max(0, fimEm - agora) : TEMPO_LEILAO_MS;
  const segundos = Math.ceil(restanteMs / 1000);
  const carta = codigo ? buscarPersonagem(codigo) : undefined;
  const quem = buscarJogador(partida, comprador);
  const vendaValida = !!carta && !!quem && podeComprar(quem, valor);

  function iniciar() {
    setAviso(null);
    setAgora(Date.now());
    setFimEm(Date.now() + TEMPO_LEILAO_MS);
  }

  function encerrar() {
    setFimEm(null);
    setFase('registro');
  }

  function lerCarta(lido: string) {
    if (!partida) return;
    const c = normalizarCodigo(lido);
    const erro = conferirCarta(partida, c);
    setErroCarta(erro);
    setCodigo(erro ? null : c);
  }

  function digitar(valorDigitado: string) {
    setTexto(valorDigitado);
    if (valorDigitado.trim().length >= 2) lerCarta(valorDigitado);
    else setErroCarta(null);
  }

  function escolherComprador(j: Jogador) {
    setComprador(j.id);
    setValor((v) => Math.min(v, j.saldo));
  }

  function limpar(mensagem: string) {
    setFase('relogio');
    setCodigo(null);
    setErroCarta(null);
    setDigitando(false);
    setTexto('');
    setComprador(null);
    setValor(0);
    setObrigatorio(null);
    setRoleta(null);
    setAviso(mensagem);
  }

  function registrar(venda: Venda) {
    if (!partida) return;
    const nova = aplicarVenda(partida, venda);
    salvarPartida(nova);
    const nome = buscarPersonagem(venda.codigo)?.nome;
    const dono = buscarJogador(nova, venda.jogadorId)?.nome;
    limpar(
      venda.jogadorId === null
        ? `${nome} ficou sem lance e foi para a repescagem (${nova.repescagem.length}/${MAX_REPESCAGEM}).`
        : `${nome} foi para ${dono} por ${formatarReais(venda.valor)}.`,
    );
  }

  function confirmarVenda() {
    if (!codigo || !quem || !vendaValida) return;
    registrar(venderCarta(codigo, quem.id, valor));
  }

  function semLance() {
    if (!partida || !codigo) return;
    const resultado = cartaSemLance(partida, codigo);
    if (resultado.tipo === 'roleta') setRoleta(resultado.candidatos);
    // Repescagem cheia: mostra para quem a carta vai antes de confirmar.
    else if (resultado.venda.tipo === 'obrigatorio') setObrigatorio(resultado.venda);
    else registrar(resultado.venda);
  }

  const total = totalLeiloes(partida);
  const donoObrigatorio = obrigatorio ? buscarJogador(partida, obrigatorio.jogadorId) : undefined;
  const naRoleta = roleta ? partida.jogadores.filter((j) => roleta.includes(j.id)) : [];

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Leilão" subtitulo={`Leilão ${partida.indiceAtual + 1} de ${total}`} />

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {fase === 'relogio' ? (
          <>
            {aviso ? (
              <View style={styles.aviso}>
                <Text style={styles.avisoTexto}>{aviso}</Text>
              </View>
            ) : null}

            <View style={styles.relogio}>
              <Cronometro
                segundos={segundos}
                fracao={restanteMs / TEMPO_LEILAO_MS}
                urgente={correndo && segundos <= 5}
                tamanho={200}
              />
              <Text style={styles.chamada}>
                {correndo ? 'Lances na mesa!' : 'Vire a próxima carta e comece o relógio.'}
              </Text>
              <Text style={styles.legenda}>
                Quando o tempo acabar, registre a carta, quem levou e por quanto.
              </Text>
            </View>

            <Rotulo>Jogadores</Rotulo>
            <GradeJogadores jogadores={partida.jogadores} />
          </>
        ) : (
          <>
            <Text style={styles.esgotado}>Tempo esgotado!</Text>

            <Rotulo>1. Qual carta?</Rotulo>
            {carta ? (
              <View style={styles.carta}>
                <ImagemPersonagem codigo={carta.codigo} style={styles.imagem} />
                <View style={styles.flex}>
                  <Text style={styles.nome} numberOfLines={2}>
                    {carta.nome}
                  </Text>
                  <Text style={styles.codigo}>{carta.codigo}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setCodigo(null);
                    setTexto('');
                    setObrigatorio(null);
                  }}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text style={styles.link}>Trocar</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <LeitorQR onLer={lerCarta} style={styles.camera} />
                {erroCarta ? <Text style={styles.erro}>{erroCarta}</Text> : null}
                {digitando ? (
                  <TextInput
                    value={texto}
                    onChangeText={digitar}
                    placeholder="Código da carta, ex.: ANI-011"
                    placeholderTextColor={cores.textoApagado}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus
                    style={styles.campo}
                  />
                ) : (
                  <Pressable onPress={() => setDigitando(true)} accessibilityRole="button" hitSlop={8}>
                    <Text style={[styles.link, styles.centro]}>QR não leu? Digitar o código</Text>
                  </Pressable>
                )}
              </>
            )}

            {obrigatorio && donoObrigatorio ? (
              <View style={styles.aviso}>
                <Text style={styles.avisoTexto}>
                  Repescagem cheia: {carta?.nome} vai para {donoObrigatorio.nome}, que tem mais vagas, por{' '}
                  {formatarReais(obrigatorio.valor)}.
                </Text>
              </View>
            ) : (
              <>
                <Rotulo>2. Quem levou?</Rotulo>
                <GradeJogadores
                  jogadores={partida.jogadores}
                  selecionado={comprador}
                  onSelecionar={escolherComprador}
                />

                <Rotulo>3. Por quanto?</Rotulo>
                <SeletorValor valor={valor} maximo={quem?.saldo} onMudar={setValor} />
                {quem ? (
                  <Text style={styles.legenda}>
                    Saldo de {quem.nome}: {formatarReais(quem.saldo)} → {formatarReais(quem.saldo - valor)}
                  </Text>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Roleta
        visivel={!!roleta && !!codigo}
        carta={carta?.nome ?? ''}
        motivo="Repescagem cheia e empate em vagas"
        jogadores={naRoleta}
        valor={(j) => (codigo ? vendaObrigatoria(partida, codigo, j.id).valor : 0)}
        onConfirmar={(id) => codigo && registrar(vendaObrigatoria(partida, codigo, id))}
        onCancelar={() => setRoleta(null)}
      />

      <View style={[styles.rodape, { paddingBottom: bottom + 16 }]}>
        {fase === 'relogio' ? (
          correndo ? (
            <Botao titulo="Encerrar agora" variante="secundario" onPress={encerrar} style={styles.flex} />
          ) : (
            <Botao titulo="Começar 20 s" onPress={iniciar} style={styles.flex} />
          )
        ) : obrigatorio ? (
          <>
            <Botao titulo="Confirmar" onPress={() => registrar(obrigatorio)} style={styles.flex} />
            <Botao
              titulo="Cancelar"
              variante="secundario"
              onPress={() => setObrigatorio(null)}
              style={styles.secundario}
            />
          </>
        ) : (
          <>
            <Botao titulo="Confirmar venda" onPress={confirmarVenda} desativado={!vendaValida} style={styles.flex} />
            <Botao
              titulo="Sem lance"
              variante="secundario"
              onPress={semLance}
              desativado={!carta}
              style={styles.secundario}
            />
          </>
        )}
      </View>
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
  vazio: {
    padding: 24,
    gap: 16,
  },
  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 14,
  },
  relogio: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  chamada: {
    fontFamily: fontes.titulo,
    fontSize: 18,
    color: cores.douradoClaro,
    textAlign: 'center',
    marginTop: 6,
  },
  legenda: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  aviso: {
    backgroundColor: cores.painelClaro,
    borderColor: cores.habitat.ar,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  avisoTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.texto,
    textAlign: 'center',
  },
  esgotado: {
    fontFamily: fontes.titulo,
    fontSize: 20,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
  camera: {
    height: 260,
    borderRadius: 14,
  },
  erro: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.erro,
    textAlign: 'center',
  },
  link: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
  },
  centro: {
    textAlign: 'center',
  },
  campo: {
    height: 44,
    backgroundColor: cores.painel,
    borderColor: cores.douradoEscuro,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    color: cores.texto,
    fontFamily: fontes.numero,
    fontSize: 16,
    letterSpacing: 1,
  },
  carta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: cores.dourado,
    backgroundColor: cores.painel,
  },
  imagem: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  nome: {
    fontFamily: fontes.titulo,
    fontSize: 17,
    color: cores.douradoClaro,
  },
  codigo: {
    fontFamily: fontes.numero,
    fontSize: 13,
    letterSpacing: 0.78,
    color: cores.textoSuave,
    marginTop: 2,
  },
  rodape: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  secundario: {
    width: 124,
    paddingHorizontal: 6,
  },
});
