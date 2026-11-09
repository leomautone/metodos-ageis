import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { Cabecalho } from '@/components/Cabecalho';
import { Cronometro } from '@/components/Cronometro';
import { GradeJogadores } from '@/components/GradeJogadores';
import { HabitatTag } from '@/components/HabitatTag';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { Roleta } from '@/components/Roleta';
import { Rotulo } from '@/components/Rotulo';
import { SeletorValor } from '@/components/SeletorValor';
import { buscarPersonagem } from '@/data/personagens';
import { aplicarVenda, podeComprar } from '@/partida/leilao';
import { buscarJogador, formatarReais, salvarPartida, usePartida, type Jogador, type Venda } from '@/partida/partida';
import {
  cartaDaVez,
  semLanceNaRepescagem,
  sortearRepescagem,
  TEMPO_REPESCAGEM_MS,
  vendaSobra,
  venderNaRepescagem,
} from '@/partida/repescagem';
import { cores, fontes } from '@/theme';

// Repescagem (SCRUM-23): os personagens sem lance voltam à mesa um de cada vez,
// em ordem sorteada, com 10 s de lance. No fim, registra quem levou e por quanto.
export default function Repescagem() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [fase, setFase] = useState<'relogio' | 'registro'>('relogio');
  const [fimEm, setFimEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const [comprador, setComprador] = useState<number | null>(null);
  const [valor, setValor] = useState(0);
  // Sem lance: mostra quem fica com o personagem antes de confirmar.
  const [sobra, setSobra] = useState<Venda | null>(null);
  // Sem lance e empate em quem tem menos dinheiro: a roleta decide.
  const [roleta, setRoleta] = useState<number[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const terminou = partida !== null && partida.repescagem.length === 0;
  const semOrdem = partida !== null && !terminou && !partida.repescagemSorteada;

  useEffect(() => {
    if (terminou) router.replace('/partida/times');
  }, [terminou]);

  // A ordem dos personagens é sorteada uma vez só, ao entrar.
  useEffect(() => {
    if (semOrdem && partida) salvarPartida(sortearRepescagem(partida));
  }, [semOrdem, partida]);

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

  const codigo = partida ? cartaDaVez(partida) : null;
  const p = codigo ? buscarPersonagem(codigo) : undefined;

  if (!partida || !partida.repescagemSorteada || !codigo || !p) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Repescagem" />
      </View>
    );
  }

  const correndo = fimEm !== null;
  const restanteMs = correndo ? Math.max(0, fimEm - agora) : TEMPO_REPESCAGEM_MS;
  const segundos = Math.ceil(restanteMs / 1000);
  const quem = buscarJogador(partida, comprador);
  const vendaValida = !!quem && podeComprar(quem, valor);
  const restantes = partida.repescagem.length;
  const naRoleta = roleta ? partida.jogadores.filter((j) => roleta.includes(j.id)) : [];
  const donoSobra = sobra ? buscarJogador(partida, sobra.jogadorId) : undefined;

  function iniciar() {
    setAviso(null);
    setAgora(Date.now());
    setFimEm(Date.now() + TEMPO_REPESCAGEM_MS);
  }

  function encerrar() {
    setFimEm(null);
    setFase('registro');
  }

  function escolherComprador(j: Jogador) {
    setComprador(j.id);
    setValor((v) => Math.min(v, j.saldo));
  }

  function registrar(venda: Venda) {
    if (!partida) return;
    const nova = aplicarVenda(partida, venda);
    salvarPartida(nova);
    setFase('relogio');
    setComprador(null);
    setValor(0);
    setSobra(null);
    setRoleta(null);
    setAviso(
      `${buscarPersonagem(venda.codigo)?.nome} foi para ${buscarJogador(nova, venda.jogadorId)?.nome} por ${formatarReais(venda.valor)}.`,
    );
  }

  function semLance() {
    if (!partida || !codigo) return;
    const resultado = semLanceNaRepescagem(partida, codigo);
    if (resultado.tipo === 'roleta') setRoleta(resultado.candidatos);
    else setSobra(resultado.venda);
  }

  return (
    <View style={styles.tela}>
      <Cabecalho
        titulo="Repescagem"
        subtitulo={restantes === 1 ? 'Último personagem' : `Faltam ${restantes} personagens`}
      />

      <ScrollView contentContainerStyle={styles.conteudo}>
        {aviso && fase === 'relogio' ? (
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>{aviso}</Text>
          </View>
        ) : null}

        <View style={styles.carta}>
          <View style={styles.cartaTopo}>
            <ImagemPersonagem codigo={p.codigo} style={styles.imagem} />
            <View style={styles.flex}>
              <Text style={styles.nome} numberOfLines={2}>
                {p.nome}
              </Text>
              <Text style={styles.codigo}>{p.codigo}</Text>
              <View style={styles.habitats}>
                {p.habitats.map((h) => (
                  <HabitatTag key={h} habitat={h} tamanho={24} />
                ))}
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/personagens/[codigo]', params: { codigo: p.codigo } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.atributos, pressed && styles.atributosPressionado]}
              >
                <Text style={styles.atributosTexto}>Ver atributos</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.descricao}>“{p.descricao}”</Text>
        </View>

        {fase === 'relogio' ? (
          <>
            <View style={styles.relogio}>
              <Cronometro
                segundos={segundos}
                fracao={restanteMs / TEMPO_REPESCAGEM_MS}
                urgente={correndo && segundos <= 3}
                tamanho={150}
              />
              <Text style={styles.legenda}>
                {correndo
                  ? 'Lances na mesa! Só quem ainda tem vaga pode levar.'
                  : 'Quando o tempo acabar, registre quem levou e por quanto.'}
              </Text>
            </View>
            <Rotulo>Jogadores</Rotulo>
            <GradeJogadores jogadores={partida.jogadores} />
          </>
        ) : sobra && donoSobra ? (
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>
              Ninguém deu lance: {p.nome} fica com {donoSobra.nome}, que tem menos dinheiro, por{' '}
              {formatarReais(sobra.valor)}.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.esgotado}>Tempo esgotado!</Text>
            <Rotulo>Quem levou?</Rotulo>
            <GradeJogadores jogadores={partida.jogadores} selecionado={comprador} onSelecionar={escolherComprador} />
            <Rotulo>Por quanto?</Rotulo>
            <SeletorValor valor={valor} maximo={quem?.saldo} onMudar={setValor} />
            {quem ? (
              <Text style={styles.legenda}>
                Saldo de {quem.nome}: {formatarReais(quem.saldo)} → {formatarReais(quem.saldo - valor)}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      <Roleta
        visivel={!!roleta}
        carta={p.nome}
        motivo="Ninguém deu lance e há empate em quem tem menos dinheiro"
        jogadores={naRoleta}
        valor={(j) => vendaSobra(partida, p.codigo, j.id).valor}
        onConfirmar={(id) => registrar(vendaSobra(partida, p.codigo, id))}
        onCancelar={() => setRoleta(null)}
      />

      <View style={[styles.rodape, { paddingBottom: bottom + 16 }]}>
        {fase === 'relogio' ? (
          correndo ? (
            <Botao titulo="Encerrar agora" variante="secundario" onPress={encerrar} style={styles.flex} />
          ) : (
            <Botao titulo="Começar 10 s" onPress={iniciar} style={styles.flex} />
          )
        ) : sobra ? (
          <>
            <Botao titulo="Confirmar" onPress={() => registrar(sobra)} style={styles.flex} />
            <Botao titulo="Cancelar" variante="secundario" onPress={() => setSobra(null)} style={styles.secundario} />
          </>
        ) : (
          <>
            <Botao
              titulo="Confirmar venda"
              onPress={() => quem && registrar(venderNaRepescagem(p.codigo, quem.id, valor))}
              desativado={!vendaValida}
              style={styles.flex}
            />
            <Botao titulo="Sem lance" variante="secundario" onPress={semLance} style={styles.secundario} />
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
  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 14,
  },
  aviso: {
    backgroundColor: cores.painelClaro,
    borderColor: cores.habitat.ar,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avisoTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.texto,
    textAlign: 'center',
  },
  carta: {
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: cores.dourado,
    backgroundColor: cores.painel,
  },
  cartaTopo: {
    flexDirection: 'row',
    gap: 14,
  },
  imagem: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },
  nome: {
    fontFamily: fontes.titulo,
    fontSize: 18,
    color: cores.douradoClaro,
  },
  codigo: {
    fontFamily: fontes.numero,
    fontSize: 13,
    letterSpacing: 0.78,
    color: cores.textoSuave,
    marginTop: 4,
  },
  habitats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  atributos: {
    height: 30,
    borderRadius: 8,
    backgroundColor: cores.painelClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  atributosPressionado: {
    backgroundColor: cores.douradoEscuro,
  },
  atributosTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
  },
  descricao: {
    fontFamily: fontes.textoItalico,
    fontSize: 13,
    lineHeight: 19,
    color: cores.textoSuave,
  },
  relogio: {
    alignItems: 'center',
    gap: 10,
  },
  legenda: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  esgotado: {
    fontFamily: fontes.titulo,
    fontSize: 20,
    color: cores.douradoClaro,
    textAlign: 'center',
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
