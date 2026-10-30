import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_ROUNDS, type Evento, type Round, type Zona } from '@/batalha/motor';
import { narrarRound, nome, nomeHabilidade } from '@/batalha/narracao';
import { Botao } from '@/components/Botao';
import { Cabecalho } from '@/components/Cabecalho';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { Rotulo } from '@/components/Rotulo';
import { formatarChance } from '@/data/formatar';
import { buscarJogador, usePartida } from '@/partida/partida';
import { cores, fontes } from '@/theme';

const ZONA: Record<Zona, { rotulo: string; cor: string }> = {
  terra: { rotulo: 'TERRA', cor: cores.habitat.terra },
  agua: { rotulo: 'ÁGUA', cor: cores.habitat.agua },
  ar: { rotulo: 'AR', cor: cores.habitat.ar },
  neutra: { rotulo: 'CLAREIRA', cor: cores.dourado },
};

const CONDICAO: Record<Zona, string> = {
  terra: 'Terremoto: quem é da terra ganha +2',
  agua: 'Enchente: quem é da água ganha +2',
  ar: 'Vendaval: quem voa ganha +1,5',
  neutra: '',
};

// Batalha (SCRUM-24 e SCRUM-26): chances antes da luta e os eventos round a round.
export default function Batalha() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [pagina, setPagina] = useState(0);

  const batalha = partida?.batalha;
  const eventos = batalha?.resultado.eventos ?? [];
  const rounds = [...new Set(eventos.filter((e) => e.tipo !== 'vencedor').map((e) => e.round))];

  // Sem nenhum duelo (sobrou só um time), vai direto para o resultado.
  const semLuta = !!batalha && rounds.length === 0;
  useEffect(() => {
    if (semLuta) router.replace('/partida/resultado');
  }, [semLuta]);

  if (!partida || !batalha || semLuta) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Batalha" />
      </View>
    );
  }

  const round = rounds[pagina];
  const ultimo = pagina === rounds.length - 1;
  const proximo = rounds[pagina + 1];
  const jogador = (id: number) => buscarJogador(partida, id)?.nome ?? '?';
  const doRound = eventos.filter((e) => e.round === round && e.tipo !== 'vencedor');

  const chances = partida.jogadores
    .map((j) => ({ j, chance: batalha.chances[j.id] ?? 0 }))
    .sort((a, b) => b.chance - a.chance);

  function avancar() {
    if (ultimo) router.push('/partida/resultado');
    else setPagina(pagina + 1);
  }

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Batalha" subtitulo={tituloDoRound(round)} />

      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.chances}>
          <Rotulo>Chance de vitória</Rotulo>
          {chances.map(({ j, chance }, i) => (
            <View key={j.id} style={styles.chance}>
              <Text style={styles.chanceNome} numberOfLines={1}>
                {j.nome}
              </Text>
              <View style={styles.barraFundo}>
                <View
                  style={[
                    styles.barra,
                    { width: `${chance * 100}%`, backgroundColor: i === 0 ? cores.dourado : cores.douradoEscuro },
                  ]}
                />
              </View>
              <Text style={styles.chanceValor}>{formatarChance(chance)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.arena}>
          <Text style={styles.arenaTexto}>
            {round === 'final' ? 'Clareira no centro da savana' : 'Savana com lago e penhasco'}
          </Text>
        </View>

        {doRound.length === 0 ? <Text style={styles.calmo}>Ninguém arriscou um ataque neste round.</Text> : null}

        {doRound.map((e, i) =>
          e.tipo === 'duelo' ? <CartaoDuelo key={i} evento={e} /> : <Aviso key={i} evento={e} jogador={jogador} />,
        )}

        <View style={styles.narracao}>
          <Text style={styles.narracaoRotulo}>NARRAÇÃO</Text>
          <Text style={styles.narracaoTexto}>{narrarRound(eventos, round, jogador)}</Text>
        </View>
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: bottom + 12 }]}>
        <Botao
          titulo={ultimo ? 'Ver resultado' : proximo === 'final' ? 'Duelo final' : 'Próximo round'}
          onPress={avancar}
        />
        {!ultimo ? (
          <Pressable onPress={() => router.push('/partida/resultado')} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Pular para o resultado</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function tituloDoRound(round: Round) {
  return round === 'final' ? 'Duelo final' : `Round ${round} de ${MAX_ROUNDS}`;
}

function CartaoDuelo({ evento }: { evento: Evento }) {
  const { atacante, alvo, eliminado } = evento;
  const zona = ZONA[evento.zona ?? 'neutra'];
  const habilidades = evento.habilidades_usadas.map(nomeHabilidade).join(', ');
  return (
    <View style={styles.duelo}>
      <View style={styles.dueloLinha}>
        <ImagemPersonagem codigo={atacante!} style={styles.rosto} apagada={eliminado === atacante} />
        <View style={styles.dueloCentro}>
          <Text style={styles.vs}>VS</Text>
          <View style={[styles.zona, { backgroundColor: zona.cor }]}>
            <Text style={styles.zonaTexto}>{zona.rotulo}</Text>
          </View>
        </View>
        <ImagemPersonagem codigo={alvo!} style={styles.rosto} apagada={eliminado === alvo} />
      </View>
      <View style={styles.nomes}>
        <Text style={[styles.dueloNome, eliminado !== atacante && styles.vencedor]} numberOfLines={1}>
          {nome(atacante)}
        </Text>
        <Text style={[styles.dueloNome, styles.direita, eliminado !== alvo && styles.vencedor]} numberOfLines={1}>
          {nome(alvo)}
        </Text>
      </View>
      <Text style={styles.dueloResumo}>
        {evento.zebra ? <Text style={styles.zebra}>ZEBRA · </Text> : null}
        {nome(eliminado)} caiu{habilidades ? ` · ${habilidades}` : ''}
      </Text>
    </View>
  );
}

function Aviso({ evento, jogador }: { evento: Evento; jogador: (id: number) => string }) {
  let texto = '';
  switch (evento.tipo) {
    case 'esquiva':
      texto = `${nome(evento.alvo)} esquivou com ${nomeHabilidade(evento.habilidades_usadas[0] ?? '')}`;
      break;
    case 'ultima_resistencia':
      texto = `Última resistência: ${nome(evento.atacante)} luta sozinho por ${jogador(evento.time ?? 0)}`;
      break;
    case 'arena_fecha':
      texto = 'A arena se fecha na clareira: agora todos se alcançam';
      break;
    case 'condicao_final':
      texto = CONDICAO[evento.zona ?? 'neutra'];
      break;
  }
  return (
    <View style={[styles.aviso, evento.tipo !== 'esquiva' && styles.avisoDourado]}>
      <Text style={styles.avisoTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  chances: {
    gap: 6,
  },
  chance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chanceNome: {
    width: 60,
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.texto,
  },
  barraFundo: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: cores.painelClaro,
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
    borderRadius: 5,
  },
  chanceValor: {
    width: 52,
    fontFamily: fontes.numeroForte,
    fontSize: 14,
    color: cores.douradoClaro,
    textAlign: 'right',
  },
  arena: {
    height: 30,
    borderRadius: 15,
    backgroundColor: cores.painelClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  arenaTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
  },
  calmo: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  duelo: {
    backgroundColor: cores.painel,
    borderColor: cores.douradoEscuro,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dueloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rosto: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  dueloCentro: {
    alignItems: 'center',
    gap: 4,
  },
  vs: {
    fontFamily: fontes.numeroForte,
    fontSize: 18,
    color: cores.dourado,
  },
  zona: {
    minWidth: 64,
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zonaTexto: {
    fontFamily: fontes.numero,
    fontSize: 11,
    letterSpacing: 0.66,
    color: cores.fundo,
  },
  nomes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  dueloNome: {
    flex: 1,
    fontFamily: fontes.textoForte,
    fontSize: 12,
    color: cores.textoSuave,
  },
  direita: {
    textAlign: 'right',
  },
  vencedor: {
    color: cores.douradoClaro,
  },
  dueloResumo: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.texto,
    textAlign: 'center',
    marginTop: 4,
  },
  zebra: {
    fontFamily: fontes.numero,
    color: cores.zebra,
  },
  aviso: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.habitat.ar,
    backgroundColor: cores.painelClaro,
    justifyContent: 'center',
  },
  avisoDourado: {
    borderColor: cores.dourado,
  },
  avisoTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.texto,
    textAlign: 'center',
  },
  narracao: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.dourado,
    backgroundColor: 'rgba(140,107,31,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  narracaoRotulo: {
    fontFamily: fontes.numero,
    fontSize: 11,
    letterSpacing: 0.88,
    color: cores.douradoClaro,
  },
  narracaoTexto: {
    fontFamily: fontes.textoItalico,
    fontSize: 13,
    lineHeight: 19,
    color: cores.texto,
  },
  rodape: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 12,
  },
  link: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
});
