import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Evento, Round, Zona } from '@/batalha/motor';
import { nome, nomeHabilidade } from '@/batalha/narracao';
import { Cabecalho } from '@/components/Cabecalho';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { Rotulo } from '@/components/Rotulo';
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

// Combates: cada duelo com as imagens, separados por round, e quem saiu em cada um.
export default function Combates() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const eventos = partida?.batalha?.resultado.eventos ?? [];
  const rounds = [...new Set(eventos.filter((e) => e.tipo !== 'vencedor').map((e) => e.round))];
  const jogador = (id: number) => (partida ? buscarJogador(partida, id)?.nome : undefined) ?? '?';

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Combates" subtitulo="Eliminados em cada round" />

      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: bottom + 24 }]}>
        {rounds.length === 0 ? <Text style={styles.calmo}>Não houve combates nesta batalha.</Text> : null}

        {rounds.map((round) => {
          const doRound = eventos.filter((e) => e.round === round && e.tipo !== 'vencedor');
          const eliminados = doRound.filter((e) => e.tipo === 'duelo').map((e) => nome(e.eliminado));
          return (
            <View key={String(round)} style={styles.round}>
              <Rotulo style={styles.rotulo}>{tituloDoRound(round)}</Rotulo>
              <View style={styles.eliminados}>
                <Text style={styles.eliminadosRotulo}>FORA</Text>
                <Text style={styles.eliminadosTexto}>
                  {eliminados.length > 0 ? eliminados.join(', ') : 'Ninguém caiu neste round'}
                </Text>
              </View>
              {doRound.map((e, i) =>
                e.tipo === 'duelo' ? <CartaoDuelo key={i} evento={e} /> : <Aviso key={i} evento={e} jogador={jogador} />,
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function tituloDoRound(round: Round) {
  return round === 'final' ? 'Duelo final' : `Round ${round}`;
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
        {nome(eliminado)} FORA!{habilidades ? ` · ${habilidades}` : ''}
      </Text>
    </View>
  );
}

function Aviso({ evento, jogador }: { evento: Evento; jogador: (id: number) => string }) {
  let texto = '';
  switch (evento.tipo) {
    case 'esquiva':
      texto = `${nome(evento.alvo)} esquivou de ${nome(evento.atacante)} com ${nomeHabilidade(evento.habilidades_usadas[0] ?? '')}`;
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
  if (!texto) return null;
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
    gap: 18,
  },
  calmo: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  round: {
    gap: 10,
  },
  rotulo: {
    fontSize: 13,
    color: cores.douradoClaro,
  },
  eliminados: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: cores.painelClaro,
  },
  eliminadosRotulo: {
    fontFamily: fontes.numeroForte,
    fontSize: 13,
    letterSpacing: 1,
    color: cores.zebra,
  },
  eliminadosTexto: {
    flex: 1,
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.texto,
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
});
