import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  calcularChances,
  criarAleatorio,
  SIMULACOES,
  simularBatalha,
} from "@/batalha/motor";
import { pedirNarracao } from "@/batalha/narracaoIA";
import { Avatar } from "@/components/Avatar";
import { Botao } from "@/components/Botao";
import { Cabecalho } from "@/components/Cabecalho";
import { ImagemPersonagem } from "@/components/ImagemPersonagem";
import { buscarPersonagem } from "@/data/personagens";
import {
  formatarReais,
  obterPartida,
  salvarPartida,
  TAMANHO_TIME,
  usePartida,
} from "@/partida/partida";
import {
  girosDisponiveis,
  itensDoJogador,
  podeGirar,
  sorteParaNarracao,
  timeDaBatalha,
} from "@/partida/sorte";
import { cores, fontes } from "@/theme";

// Times (SCRUM-25): os personagens de cada jogador, o saldo final, a roleta de
// bênçãos e maldições e a ida para a batalha (calculada aqui e narrada pela IA).
const MARCA = { bencao: "✦", maldicao: "☠", neutro: "⚖" };

export default function Times() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [fase, setFase] = useState<"pronta" | "calculando" | "narrando">(
    "pronta",
  );
  const cancelarIA = useRef<AbortController | null>(null);

  // Time só fica completo depois da repescagem.
  const faltaRepescagem = (partida?.repescagem.length ?? 0) > 0;
  useEffect(() => {
    if (faltaRepescagem) router.replace("/partida/repescagem");
  }, [faltaRepescagem]);

  if (!partida) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Times" />
        <Text style={[styles.aviso, styles.margem]}>
          Nenhuma partida em andamento.
        </Text>
      </View>
    );
  }

  function irParaBatalha() {
    if (!partida) return;
    if (partida.batalha) {
      router.push("/partida/batalha");
      return;
    }
    setFase("calculando");
    // Deixa a tela mostrar "Calculando…" antes das 2.000 simulações.
    setTimeout(async () => {
      const times = partida.jogadores.map((j) => timeDaBatalha(partida, j));
      const chances = calcularChances(times);
      const resultado = simularBatalha(times, criarAleatorio(Date.now()));
      salvarPartida({
        ...partida,
        batalha: { chances, resultado, narracao: null },
      });

      // A IA só narra: o resultado acima já está decidido e salvo.
      setFase("narrando");
      const controle = new AbortController();
      cancelarIA.current = controle;
      const narracao = await pedirNarracao(
        resultado,
        partida.jogadores.map((j) => ({
          id: j.id,
          nome: j.nome,
          time: j.time,
          sorte: sorteParaNarracao(partida, j.id),
        })),
        controle.signal,
      );
      cancelarIA.current = null;
      const atual = obterPartida();
      if (atual?.batalha)
        salvarPartida({ ...atual, batalha: { ...atual.batalha, narracao } });
      setFase("pronta");
      router.push("/partida/batalha");
    }, 50);
  }

  const roleta = podeGirar(partida);

  return (
    <View style={styles.tela}>
      <Cabecalho
        titulo="Times"
        subtitulo="Leilão encerrado"
        onVoltar={() => router.dismissTo("/")}
      />

      <ScrollView contentContainerStyle={styles.conteudo}>
        {partida.jogadores.map((j) => {
          const itens = itensDoJogador(partida, j.id);
          const giros = partida.batalha ? 0 : girosDisponiveis(partida, j);
          return (
            <View key={j.id} style={styles.time}>
              <View style={styles.timeTopo}>
                <Avatar
                  jogadorId={j.id}
                  texto={j.nome.charAt(0).toUpperCase()}
                  tamanho={30}
                />
                <Text style={styles.nome} numberOfLines={1}>
                  {j.nome}
                </Text>
                <Text style={styles.sobra}>
                  Sobrou {formatarReais(j.saldo)}
                  {giros > 0
                    ? ` · ${giros} ${giros === 1 ? "giro" : "giros"}`
                    : ""}
                </Text>
              </View>
              <View style={styles.cartas}>
                {Array.from({ length: TAMANHO_TIME }, (_, i) => {
                  const codigo = j.time[i];
                  return (
                    <View key={i} style={styles.carta}>
                      {codigo ? (
                        <ImagemPersonagem
                          codigo={codigo}
                          style={styles.imagem}
                        />
                      ) : (
                        <View style={[styles.imagem, styles.vaga]} />
                      )}
                      <Text style={styles.cartaNome} numberOfLines={1}>
                        {codigo ? buscarPersonagem(codigo)?.nome : "vaga"}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {itens.length > 0 ? (
                <View style={styles.selos}>
                  {itens.map((item, i) => (
                    <View key={i} style={[styles.selo, styles[item.tipo]]}>
                      <Text style={styles.seloTexto}>
                        {MARCA[item.tipo]} {item.nome}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: bottom + 16 }]}>
        {fase === "narrando" ? (
          <View style={styles.narrando}>
            <Text style={styles.narrandoTitulo}>
              Os bardos estão escrevendo a lenda…
            </Text>
            <Text style={styles.legenda}>
              A IA está narrando a batalha (até 1 minuto).
            </Text>
            <Botao
              titulo="Seguir sem IA"
              variante="secundario"
              onPress={() => cancelarIA.current?.abort()}
            />
          </View>
        ) : (
          <>
            {roleta ? (
              <Botao
                titulo="Roleta de bênçãos e maldições"
                variante="secundario"
                onPress={() => router.push("/partida/sorte")}
                desativado={fase !== "pronta"}
              />
            ) : null}
            <Botao
              titulo={
                fase === "calculando"
                  ? "Calculando…"
                  : partida.batalha
                    ? "Ver a batalha"
                    : "Ir para a batalha"
              }
              onPress={irParaBatalha}
              desativado={fase !== "pronta"}
            />
            <Text style={styles.legenda}>
              {roleta
                ? "Quem tem R$ 5 ou mais pode girar a roleta antes da batalha (opcional)."
                : `Chances calculadas em ${SIMULACOES.toLocaleString("pt-BR")} simulações`}
            </Text>
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
  margem: {
    padding: 24,
  },
  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },
  time: {
    backgroundColor: cores.painel,
    borderColor: cores.douradoEscuro,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  timeTopo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nome: {
    flex: 1,
    fontFamily: fontes.textoForte,
    fontSize: 16,
    color: cores.texto,
  },
  sobra: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
  },
  cartas: {
    flexDirection: "row",
    gap: 12,
  },
  carta: {
    flex: 1,
    gap: 3,
  },
  imagem: {
    height: 58,
    borderRadius: 8,
  },
  vaga: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cores.douradoEscuro,
  },
  cartaNome: {
    fontFamily: fontes.textoMedio,
    fontSize: 11,
    color: cores.texto,
    textAlign: "center",
  },
  selos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  selo: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  bencao: {
    borderColor: cores.sucesso,
    backgroundColor: "rgba(111,191,115,0.15)",
  },
  maldicao: {
    borderColor: cores.zebra,
    backgroundColor: "rgba(208,98,74,0.15)",
  },
  neutro: {
    borderColor: cores.textoApagado,
    backgroundColor: "rgba(160,160,160,0.12)",
  },
  seloTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 11,
    color: cores.texto,
  },
  aviso: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: "center",
  },
  rodape: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 10,
  },
  narrando: {
    gap: 8,
  },
  narrandoTitulo: {
    fontFamily: fontes.titulo,
    fontSize: 17,
    color: cores.douradoClaro,
    textAlign: "center",
  },
  legenda: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: "center",
  },
});
