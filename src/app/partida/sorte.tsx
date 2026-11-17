import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { Botao } from "@/components/Botao";
import { Cabecalho } from "@/components/Cabecalho";
import { Roda, type FatiaRoda } from "@/components/Roda";
import { Rotulo } from "@/components/Rotulo";
import { buscarPersonagem, type Habitat } from "@/data/personagens";
import { chanceDoItem, ITENS_SORTE, type ItemSorte } from "@/data/sorte";
import {
  buscarJogador,
  formatarReais,
  salvarPartida,
  usePartida,
} from "@/partida/partida";
import { sortearGiroPorPeso } from "@/partida/roleta";
import {
  aplicarGiro,
  CUSTO_GIRO,
  escolherTerreno,
  girosDisponiveis,
  girosDoJogador,
  girosGratis,
  itensDoJogador,
  terrenoPendente,
} from "@/partida/sorte";
import { cores, fontes } from "@/theme";

// Cores alternadas: verdes/dourados nas bênçãos, vermelhos/roxos nas maldições,
// cinzas no resto (Perdeu a Vez, Troca do Destino).
const CORES = {
  bencao: ["#6FBF73", "#D4AF37", "#82C99A"],
  maldicao: ["#D0624A", "#8E5A9E", "#B04A4A"],
  neutro: ["#9AA0A6", "#6E757C"],
};
const TITULO = { bencao: "BÊNÇÃO!", maldicao: "MALDIÇÃO!", neutro: "DESTINO!" };
const MARCA = { bencao: "✦", maldicao: "☠", neutro: "⚖" };
const TERRENOS: { habitat: Habitat; rotulo: string }[] = [
  { habitat: "terra", rotulo: "Terremoto (terra)" },
  { habitat: "agua", rotulo: "Enchente (água)" },
  { habitat: "ar", rotulo: "Vendaval (ar)" },
];

const FATIAS: FatiaRoda[] = (() => {
  const usados = { bencao: 0, maldicao: 0, neutro: 0 };
  return ITENS_SORTE.map((item) => {
    const lista = CORES[item.tipo];
    return {
      chave: item.id,
      rotulo: item.curto,
      peso: item.peso,
      cor: lista[usados[item.tipo]++ % lista.length],
      corTexto: item.tipo === "maldicao" ? cores.zebraTexto : cores.fundo,
    };
  });
})();

// Roleta de bênçãos e maldições: depois do draft, quem tem R$ 5 ou mais pode
// girar (não é obrigado). Cada giro custa R$ 5 e o efeito vale na batalha.
export default function Sorte() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [jogadorId, setJogadorId] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);
  const [girando, setGirando] = useState(false);
  const [ultimo, setUltimo] = useState<{
    jogadorId: number;
    jogador: string;
    item: ItemSorte;
    extra?: string;
  } | null>(null);
  const rotacao = useRef(0);
  const sorteado = useRef(0);

  if (!partida) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Roleta da sorte" />
      </View>
    );
  }

  const quem = buscarJogador(partida, jogadorId);
  // Senhor da Arena: o jogador precisa escolher o terreno antes de seguir.
  const pendente = ultimo ? terrenoPendente(partida, ultimo.jogadorId) : -1;
  const gratis = !!quem && girosGratis(partida, quem.id) > 0;
  const podeGirarAgora =
    !!quem &&
    girosDisponiveis(partida, quem) > 0 &&
    !girando &&
    !partida.batalha &&
    pendente < 0;

  function girar() {
    if (!podeGirarAgora) return;
    const resultado = sortearGiroPorPeso(
      rotacao.current,
      ITENS_SORTE.map((i) => i.peso),
    );
    rotacao.current = resultado.rotacao;
    sorteado.current = resultado.indice;
    setUltimo(null);
    setGirando(true);
    setAlvo(resultado.rotacao);
  }

  // A roda parou: o giro vale (R$ 5 descontados e item guardado).
  function parou() {
    if (!partida || !quem) return;
    const item = ITENS_SORTE[sorteado.current];
    const depois = aplicarGiro(partida, quem.id, item.id);
    salvarPartida(depois);
    let extra: string | undefined;
    if (item.efeito.tipo === "troca") {
      const troca = girosDoJogador(depois, quem.id).at(-1)?.troca;
      const outro = troca
        ? (buscarJogador(depois, troca.com)?.nome ?? "?")
        : "";
      extra = troca
        ? `Troquem as cartas: ${quem.nome} entrega ${nomeAnimal(troca.dei)} e recebe ${nomeAnimal(troca.recebi)} de ${outro}.`
        : "Não havia com quem trocar: nada muda.";
    } else if (item.efeito.tipo === "girosExtras") {
      extra = `${quem.nome} ganhou ${item.efeito.giros} giros de graça. Toque em Girar!`;
    }
    setUltimo({ jogadorId: quem.id, jogador: quem.nome, item, extra });
    setGirando(false);
  }

  function escolher(terreno: Habitat) {
    if (!partida || !ultimo || pendente < 0) return;
    salvarPartida(
      escolherTerreno(partida, ultimo.jogadorId, pendente, terreno),
    );
  }

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Roleta da sorte" subtitulo="Bênçãos e maldições" />

      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.explicacao}>
          Quem sobrou com {formatarReais(CUSTO_GIRO)} ou mais pode tentar a
          sorte: cada giro custa {formatarReais(CUSTO_GIRO)}. Não é obrigatório.
        </Text>

        <Rotulo>Quem vai girar?</Rotulo>
        <View style={styles.jogadores}>
          {partida.jogadores.map((j) => {
            const giros = girosDisponiveis(partida, j);
            const ativo = j.id === jogadorId;
            return (
              <Pressable
                key={j.id}
                onPress={() => setJogadorId(j.id)}
                disabled={giros === 0 || girando}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo, disabled: giros === 0 }}
                style={[
                  styles.jogador,
                  ativo && styles.jogadorAtivo,
                  giros === 0 && styles.jogadorSemGiro,
                ]}
              >
                <Avatar
                  jogadorId={j.id}
                  texto={j.nome.charAt(0).toUpperCase()}
                  tamanho={30}
                />
                <View style={styles.flex}>
                  <Text style={styles.jogadorNome} numberOfLines={1}>
                    {j.nome}
                  </Text>
                  <Text style={styles.jogadorInfo}>
                    {formatarReais(j.saldo)} ·{" "}
                    {giros === 0
                      ? "sem giros"
                      : `${giros} ${giros === 1 ? "giro" : "giros"}`}
                  </Text>
                </View>
                {itensDoJogador(partida, j.id).map((item, i) => (
                  <Text key={i} style={styles[`marca_${item.tipo}`]}>
                    {MARCA[item.tipo]}
                  </Text>
                ))}
              </Pressable>
            );
          })}
        </View>

        <Roda
          fatias={FATIAS}
          alvo={alvo}
          onParou={parou}
          onPress={girar}
          desativado={!podeGirarAgora}
          tamanho={300}
        />

        {ultimo ? (
          <View
            style={[styles.resultado, styles[`resultado_${ultimo.item.tipo}`]]}
          >
            <Text style={styles.resultadoTitulo}>
              {TITULO[ultimo.item.tipo]} {ultimo.jogador} tirou{" "}
              {ultimo.item.nome}
            </Text>
            <Text style={styles.resultadoTexto}>{ultimo.item.descricao}</Text>
            {ultimo.extra ? (
              <Text style={styles.resultadoExtra}>{ultimo.extra}</Text>
            ) : null}
            {pendente >= 0 ? (
              <View style={styles.terrenos}>
                <Text style={styles.resultadoExtra}>
                  {ultimo.jogador}, escolha como a arena vai fechar:
                </Text>
                {TERRENOS.map((t) => (
                  <Botao
                    key={t.habitat}
                    titulo={t.rotulo}
                    variante="secundario"
                    onPress={() => escolher(t.habitat)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={styles.dica}>
            {girando
              ? "Girando…"
              : quem
                ? `Vez de ${quem.nome}: toque na roleta ou em Girar`
                : "Escolha quem vai girar"}
          </Text>
        )}

        <Rotulo>O que tem na roleta</Rotulo>
        <View style={styles.legenda}>
          {ITENS_SORTE.map((item, i) => (
            <View key={item.id} style={styles.item}>
              <View style={[styles.cor, { backgroundColor: FATIAS[i].cor }]} />
              <View style={styles.flex}>
                <Text style={styles.itemNome}>{item.nome}</Text>
                <Text style={styles.itemTexto}>{item.descricao}</Text>
              </View>
              <Text style={styles.itemChance}>{chanceDoItem(item)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: bottom + 16 }]}>
        <Botao
          titulo={
            quem
              ? `Girar (${gratis ? "grátis" : formatarReais(CUSTO_GIRO)})`
              : "Girar"
          }
          onPress={girar}
          desativado={!podeGirarAgora}
          style={styles.flex}
        />
        <Botao
          titulo="Pronto"
          variante="secundario"
          onPress={() => router.back()}
          desativado={girando || pendente >= 0}
          style={styles.pronto}
        />
      </View>
    </View>
  );
}

function nomeAnimal(codigo: string) {
  return buscarPersonagem(codigo)?.nome ?? codigo;
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
    gap: 12,
  },
  explicacao: {
    fontFamily: fontes.texto,
    fontSize: 14,
    lineHeight: 20,
    color: cores.texto,
    textAlign: "center",
  },
  jogadores: {
    gap: 8,
  },
  jogador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
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
  jogadorSemGiro: {
    opacity: 0.45,
  },
  jogadorNome: {
    fontFamily: fontes.textoMedio,
    fontSize: 15,
    color: cores.texto,
  },
  jogadorInfo: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
  },
  marca_bencao: {
    fontSize: 16,
    color: cores.sucesso,
  },
  marca_maldicao: {
    fontSize: 16,
    color: cores.zebra,
  },
  marca_neutro: {
    fontSize: 16,
    color: cores.textoSuave,
  },
  dica: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
    textAlign: "center",
  },
  resultado: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  resultado_bencao: {
    borderColor: cores.sucesso,
    backgroundColor: "rgba(111,191,115,0.15)",
  },
  resultado_maldicao: {
    borderColor: cores.zebra,
    backgroundColor: "rgba(208,98,74,0.15)",
  },
  resultado_neutro: {
    borderColor: cores.textoApagado,
    backgroundColor: "rgba(160,160,160,0.12)",
  },
  resultadoExtra: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
    textAlign: "center",
  },
  terrenos: {
    gap: 8,
    marginTop: 6,
  },
  resultadoTitulo: {
    fontFamily: fontes.titulo,
    fontSize: 16,
    color: cores.douradoClaro,
    textAlign: "center",
  },
  resultadoTexto: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.texto,
    textAlign: "center",
  },
  legenda: {
    gap: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cor: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  itemNome: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.texto,
  },
  itemTexto: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
  },
  itemChance: {
    fontFamily: fontes.numeroForte,
    fontSize: 14,
    color: cores.douradoClaro,
  },
  rodape: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  pronto: {
    width: 124,
    paddingHorizontal: 6,
  },
});
