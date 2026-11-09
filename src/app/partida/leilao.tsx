import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Cabecalho } from '@/components/Cabecalho';
import { Cronometro } from '@/components/Cronometro';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { LeitorQR } from '@/components/LeitorQR';
import { Rotulo } from '@/components/Rotulo';
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
  vagas,
  venderCarta,
} from '@/partida/leilao';
import {
  buscarJogador,
  formatarReais,
  salvarPartida,
  TAMANHO_TIME,
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

  const concluido = partida !== null && leilaoConcluido(partida) && !partida.pendente;
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
    const venda = cartaSemLance(partida, codigo);
    // Repescagem cheia: quem fica com a carta sai no dado, então mostra antes.
    if (venda.tipo === 'obrigatorio') setObrigatorio(venda);
    else registrar(venda);
  }

  const total = totalLeiloes(partida);
  const donoObrigatorio = obrigatorio ? buscarJogador(partida, obrigatorio.jogadorId) : undefined;
  const dadosObrigatorio = obrigatorio?.dados
    ? Object.entries(obrigatorio.dados)
        .map(([id, valores]) => `${buscarJogador(partida, Number(id))?.nome} ${valores.join('→')}`)
        .join(' · ')
    : null;

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
                {dadosObrigatorio ? (
                  <Text style={styles.legenda}>Desempate no dado, o menor fica: {dadosObrigatorio}</Text>
                ) : null}
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
                <View style={styles.valorLinha}>
                  <Pressable
                    onPress={() => setValor(Math.max(0, valor - 1))}
                    disabled={valor <= 0}
                    accessibilityRole="button"
                    accessibilityLabel="Diminuir valor"
                    style={[styles.passo, valor <= 0 && styles.inativo]}
                  >
                    <Text style={styles.passoTexto}>−</Text>
                  </Pressable>
                  <View style={styles.valor}>
                    <Text style={styles.valorTexto}>{formatarReais(valor)}</Text>
                  </View>
                  <Pressable
                    onPress={() => setValor(valor + 1)}
                    disabled={!!quem && valor >= quem.saldo}
                    accessibilityRole="button"
                    accessibilityLabel="Aumentar valor"
                    style={[styles.passo, !!quem && valor >= quem.saldo && styles.inativo]}
                  >
                    <Text style={styles.passoTexto}>+</Text>
                  </Pressable>
                </View>
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

type GradeProps = {
  jogadores: Jogador[];
  selecionado?: number | null;
  // Sem onSelecionar, a grade só mostra saldo e vagas.
  onSelecionar?: (j: Jogador) => void;
};

// Jogadores com saldo e vagas (pontos cheios = vagas livres no time).
function GradeJogadores({ jogadores, selecionado, onSelecionar }: GradeProps) {
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
            style={[styles.jogador, ativo && styles.jogadorAtivo, bloqueado && styles.jogadorInativo]}
          >
            <Avatar jogadorId={j.id} texto={j.nome.charAt(0).toUpperCase()} tamanho={34} />
            <View style={styles.flex}>
              <Text style={styles.jogadorNome} numberOfLines={1}>
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
  jogadorAtivo: {
    borderWidth: 2,
    borderColor: cores.dourado,
    backgroundColor: cores.painelClaro,
  },
  jogadorInativo: {
    opacity: 0.45,
  },
  jogadorNome: {
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
  valorLinha: {
    flexDirection: 'row',
    gap: 8,
  },
  passo: {
    width: 64,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.dourado,
    backgroundColor: cores.painel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inativo: {
    opacity: 0.4,
  },
  passoTexto: {
    fontFamily: fontes.numeroForte,
    fontSize: 26,
    color: cores.douradoClaro,
  },
  valor: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: cores.painelClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorTexto: {
    fontFamily: fontes.numeroForte,
    fontSize: 26,
    color: cores.douradoClaro,
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
