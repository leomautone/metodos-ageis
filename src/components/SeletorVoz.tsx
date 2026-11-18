import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  escolherVoz,
  FRASE_TESTE,
  useVozEscolhida,
  vozAutomatica,
  vozesEmPortugues,
  type Qualidade,
  type VozPt,
} from "@/batalha/voz";
import { Botao } from "@/components/Botao";
import { cores, fontes } from "@/theme";

type Props = { visivel: boolean; onFechar: () => void };

const COR_QUALIDADE: Record<Qualidade, string> = {
  Premium: cores.dourado,
  Aprimorada: cores.sucesso,
  Padrão: cores.textoSuave,
  Robótica: cores.erro,
};

async function buscarVozes() {
  let lista = await Speech.getAvailableVoicesAsync().catch(() => []);
  // No iPhone a lista às vezes chega vazia na primeira vez.
  if (lista.length === 0) {
    await new Promise((r) => setTimeout(r, 600));
    lista = await Speech.getAvailableVoicesAsync().catch(() => []);
  }
  return vozesEmPortugues(lista);
}

// Lista as vozes em português do celular para o grupo ouvir e escolher a do narrador.
export function SeletorVoz({ visivel, onFechar }: Props) {
  function fechar() {
    Speech.stop();
    onFechar();
  }
  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={fechar}
    >
      {visivel ? <Janela onFechar={fechar} /> : null}
    </Modal>
  );
}

// O conteúdo só existe com a janela aberta: cada vez que abre, busca a lista de novo.
function Janela({ onFechar }: { onFechar: () => void }) {
  const [vozes, setVozes] = useState<VozPt[] | null>(null);
  const [testando, setTestando] = useState<string | null>(null);
  const escolhida = useVozEscolhida();

  useEffect(() => {
    let vivo = true;
    buscarVozes().then((lista) => {
      if (vivo) setVozes(lista);
    });
    return () => {
      vivo = false;
    };
  }, []);

  function atualizar() {
    setVozes(null);
    buscarVozes().then(setVozes);
  }

  function testar(v: VozPt) {
    Speech.stop();
    setTestando(v.id);
    Speech.speak(FRASE_TESTE, {
      language: v.idioma,
      voice: v.id,
      useApplicationAudioSession: false,
      onDone: () => setTestando((t) => (t === v.id ? null : t)),
      onStopped: () => setTestando((t) => (t === v.id ? null : t)),
      onError: () => setTestando((t) => (t === v.id ? null : t)),
    });
  }

  const automatica = vozes
    ? vozes.find((v) => v.id === vozAutomatica(vozes))
    : undefined;

  return (
    <View style={styles.fundo}>
      <View style={styles.janela}>
        <Text style={styles.titulo}>Voz do narrador</Text>
        <Text style={styles.dica}>
          Toque em Testar para ouvir e escolha a melhor. Para ter vozes
          melhores, baixe a Luciana ou o Felipe em Ajustes → Acessibilidade →
          Ler e Falar → Vozes → Português (Brasil) e toque em Atualizar lista.
        </Text>

        <ScrollView
          style={styles.lista}
          contentContainerStyle={styles.listaConteudo}
        >
          {vozes === null ? (
            <Text style={styles.dica}>Procurando as vozes do celular…</Text>
          ) : null}
          {vozes?.length === 0 ? (
            <Text style={styles.dica}>
              Nenhuma voz em português encontrada neste aparelho.
            </Text>
          ) : null}

          {vozes && vozes.length > 0 ? (
            <Linha
              nome="Automática"
              detalhe={
                automatica
                  ? `Agora: ${automatica.nome} (${automatica.qualidade})`
                  : "A melhor disponível"
              }
              ativa={escolhida === null}
              onEscolher={() => escolherVoz(null)}
            />
          ) : null}

          {vozes?.map((v) => (
            <Linha
              key={v.id}
              nome={v.nome}
              qualidade={v.qualidade}
              detalhe={
                v.idioma.toLowerCase().endsWith("br") ? "Brasil" : "Portugal"
              }
              ativa={escolhida === v.id}
              testando={testando === v.id}
              onTestar={() => testar(v)}
              onEscolher={() => escolherVoz(v.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.rodape}>
          <Botao
            titulo="Atualizar lista"
            variante="secundario"
            onPress={atualizar}
            style={styles.flex}
          />
          <Botao titulo="Pronto" onPress={onFechar} style={styles.flex} />
        </View>
      </View>
    </View>
  );
}

type LinhaProps = {
  nome: string;
  qualidade?: Qualidade;
  detalhe: string;
  ativa: boolean;
  testando?: boolean;
  onTestar?: () => void;
  onEscolher: () => void;
};

function Linha({
  nome,
  qualidade,
  detalhe,
  ativa,
  testando,
  onTestar,
  onEscolher,
}: LinhaProps) {
  return (
    <View style={[styles.linha, ativa && styles.linhaAtiva]}>
      <Pressable
        onPress={onEscolher}
        accessibilityRole="radio"
        accessibilityState={{ checked: ativa }}
        style={styles.escolher}
      >
        <View style={[styles.radio, ativa && styles.radioAtivo]} />
        <View style={styles.flex}>
          <Text style={styles.nome} numberOfLines={1}>
            {nome}
          </Text>
          <Text style={styles.detalhe} numberOfLines={1}>
            {qualidade ? (
              <Text style={{ color: COR_QUALIDADE[qualidade] }}>
                {qualidade} ·{" "}
              </Text>
            ) : null}
            {detalhe}
          </Text>
        </View>
      </Pressable>
      {onTestar ? (
        <Pressable
          onPress={onTestar}
          accessibilityRole="button"
          style={styles.testar}
        >
          <Text style={styles.testarTexto}>
            {testando ? "♪ …" : "▶ Testar"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 16,
  },
  janela: {
    maxHeight: "90%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cores.dourado,
    backgroundColor: cores.painel,
    padding: 16,
    gap: 10,
  },
  titulo: {
    fontFamily: fontes.titulo,
    fontSize: 18,
    color: cores.douradoClaro,
    textAlign: "center",
  },
  dica: {
    fontFamily: fontes.texto,
    fontSize: 12,
    lineHeight: 17,
    color: cores.textoSuave,
    textAlign: "center",
  },
  lista: {
    flexGrow: 0,
  },
  listaConteudo: {
    gap: 8,
    paddingVertical: 4,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.douradoEscuro,
    backgroundColor: cores.fundo,
  },
  linhaAtiva: {
    borderWidth: 2,
    borderColor: cores.dourado,
    backgroundColor: cores.painelClaro,
  },
  escolher: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: cores.textoSuave,
  },
  radioAtivo: {
    borderColor: cores.dourado,
    backgroundColor: cores.dourado,
  },
  nome: {
    fontFamily: fontes.textoMedio,
    fontSize: 15,
    color: cores.texto,
  },
  detalhe: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
  },
  testar: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cores.dourado,
    alignItems: "center",
    justifyContent: "center",
  },
  testarTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
  },
  rodape: {
    flexDirection: "row",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
