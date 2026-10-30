import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Round } from '@/batalha/motor';
import { nome } from '@/batalha/narracao';
import { Botao } from '@/components/Botao';
import { Estrela } from '@/components/Estrela';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { Rotulo } from '@/components/Rotulo';
import { formatarChance } from '@/data/formatar';
import { buscarPersonagem } from '@/data/personagens';
import { buscarJogador, salvarPartida, usePartida } from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Abaixo desta chance antes da luta, a vitória é anunciada como zebra.
const LIMITE_ZEBRA = 0.15;

// Quanto mais tarde o time caiu, melhor a colocação.
function peso(round: Round | undefined) {
  if (round === undefined) return 99;
  return round === 'final' ? 10 : round;
}

function comoCaiu(round: Round | undefined) {
  if (round === 'final') return 'caiu no duelo final';
  if (!round) return 'sem personagens';
  return `eliminado no round ${round}`;
}

// Resultado: o time vencedor, o personagem que ficou de pé e a classificação.
export default function Resultado() {
  const partida = usePartida();
  const { top, bottom } = useSafeAreaInsets();
  const resultado = partida?.batalha?.resultado;

  if (!partida || !resultado) {
    return <View style={styles.tela} />;
  }

  const vencedor = buscarJogador(partida, resultado.vencedor);
  const heroi = resultado.sobreviventes[0];
  const p = heroi ? buscarPersonagem(heroi) : undefined;
  const chance = vencedor ? (partida.batalha?.chances[vencedor.id] ?? 0) : 0;

  // A habilidade do herói, se ele chegou a usá-la na batalha.
  const usouHabilidade =
    p?.habilidade &&
    resultado.eventos.some(
      (e) => (e.atacante === heroi || e.alvo === heroi) && e.habilidades_usadas.includes(p.habilidade!.texto),
    );

  const classificacao = [...partida.jogadores].sort(
    (a, b) => peso(resultado.eliminacao[b.id]) - peso(resultado.eliminacao[a.id]),
  );

  function novaPartida() {
    salvarPartida(null);
    router.dismissTo('/');
    router.push('/partida/nova');
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={[styles.conteudo, { paddingTop: top + 30, paddingBottom: bottom + 24 }]}
    >
      <View style={styles.topo}>
        <View style={[styles.estrela, { left: 26, top: 40 }]}>
          <Estrela tamanho={26} />
        </View>
        <View style={[styles.estrela, { right: 38, top: 70 }]}>
          <Estrela tamanho={34} />
        </View>
        <View style={[styles.estrela, { right: 52, top: 20 }]}>
          <Estrela tamanho={14} />
        </View>
        <View style={[styles.estrela, { left: 46, top: 230 }]}>
          <Estrela tamanho={16} />
        </View>

        <Text style={styles.vitoria}>VITÓRIA</Text>
        <Text style={styles.quem}>{vencedor ? `${vencedor.nome} vence a partida` : 'Ninguém ficou de pé'}</Text>

        {heroi ? (
          <>
            <View style={styles.moldura}>
              <ImagemPersonagem codigo={heroi} style={styles.heroi} />
            </View>
            <Text style={styles.heroiNome}>{nome(heroi)}</Text>
            <Text style={styles.heroiLegenda}>
              ficou de pé{usouHabilidade ? ` · ${p!.habilidade!.texto}` : ''}
              {resultado.sobreviventes.length > 1
                ? ` · com ${resultado.sobreviventes.slice(1).map(nome).join(' e ')}`
                : ''}
            </Text>
          </>
        ) : null}

        {vencedor && chance < LIMITE_ZEBRA ? (
          <View style={styles.zebra}>
            <Text style={styles.zebraTexto}>ZEBRA! Tinha {formatarChance(chance)} de chance</Text>
          </View>
        ) : null}
      </View>

      <Rotulo style={styles.rotulo}>Classificação</Rotulo>
      <View style={styles.lista}>
        {classificacao.map((j, i) => {
          const venceu = j.id === vencedor?.id;
          return (
            <View key={j.id} style={[styles.linha, venceu && styles.linhaVencedor]}>
              <Text style={[styles.posicao, venceu && styles.posicaoVencedor]}>{i + 1}º</Text>
              <Text style={styles.nome} numberOfLines={1}>
                {j.nome}
              </Text>
              <Text style={styles.detalhe} numberOfLines={1}>
                {venceu ? `${resultado.sobreviventes.map(nome).join(', ')} de pé` : comoCaiu(resultado.eliminacao[j.id])}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.botoes}>
        <Botao titulo="Nova partida" onPress={novaPartida} />
        <Botao titulo="Voltar ao início" variante="secundario" onPress={() => router.dismissTo('/')} style={styles.voltar} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    paddingHorizontal: 24,
  },
  topo: {
    alignItems: 'center',
  },
  estrela: {
    position: 'absolute',
  },
  vitoria: {
    fontFamily: fontes.tituloPreto,
    fontSize: 44,
    letterSpacing: 2.64,
    color: cores.douradoClaro,
  },
  quem: {
    fontFamily: fontes.textoMedio,
    fontSize: 16,
    color: cores.texto,
  },
  moldura: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: cores.dourado,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  heroi: {
    width: 188,
    height: 188,
    borderRadius: 94,
  },
  heroiNome: {
    fontFamily: fontes.titulo,
    fontSize: 22,
    color: cores.douradoClaro,
    marginTop: 12,
    textAlign: 'center',
  },
  heroiLegenda: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
    textAlign: 'center',
    marginTop: 2,
  },
  zebra: {
    height: 32,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: cores.zebra,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  zebraTexto: {
    fontFamily: fontes.numero,
    fontSize: 13,
    letterSpacing: 0.52,
    color: cores.zebraTexto,
  },
  rotulo: {
    marginTop: 22,
    marginBottom: 6,
  },
  lista: {
    gap: 6,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: cores.painel,
    borderWidth: 1,
    borderColor: cores.painel,
  },
  linhaVencedor: {
    backgroundColor: cores.painelClaro,
    borderColor: cores.dourado,
  },
  posicao: {
    width: 40,
    fontFamily: fontes.numeroForte,
    fontSize: 16,
    color: cores.textoSuave,
  },
  posicaoVencedor: {
    color: cores.dourado,
  },
  nome: {
    flex: 1,
    fontFamily: fontes.textoForte,
    fontSize: 15,
    color: cores.texto,
  },
  detalhe: {
    maxWidth: '60%',
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'right',
  },
  botoes: {
    gap: 8,
    marginTop: 14,
  },
  voltar: {
    height: 48,
  },
});
