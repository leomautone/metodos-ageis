import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Polygon, Text as SvgText } from 'react-native-svg';

import { Botao } from '@/components/Botao';
import { Painel } from '@/components/Painel';
import { formatarReais, type Jogador } from '@/partida/partida';
import { centroDaFatia, sortearGiro } from '@/partida/roleta';
import { corDoJogador, cores, fontes } from '@/theme';

type Props = {
  visivel: boolean;
  // Nome da carta em jogo, para o título.
  carta: string;
  // Os empatados, um por fatia.
  jogadores: Jogador[];
  // Valor que quem cair vai pagar (R$ 1, ou zero para quem não tem saldo).
  valor: (jogador: Jogador) => number;
  onConfirmar: (jogadorId: number) => void;
  onCancelar: () => void;
};

const TAMANHO = 280;
const RAIO = TAMANHO / 2 - 6;
const CENTRO = TAMANHO / 2;
const DURACAO_MS = 4500;

function ponto(angulo: number, raio: number) {
  const rad = (angulo * Math.PI) / 180;
  return { x: CENTRO + raio * Math.sin(rad), y: CENTRO - raio * Math.cos(rad) };
}

function fatia(inicio: number, fim: number) {
  const a = ponto(inicio, RAIO);
  const b = ponto(fim, RAIO);
  const grande = fim - inicio > 180 ? 1 : 0;
  return `M ${CENTRO} ${CENTRO} L ${a.x} ${a.y} A ${RAIO} ${RAIO} 0 ${grande} 1 ${b.x} ${b.y} Z`;
}

// Roleta do desempate: quem tocar gira, e todos veem em quem ela para.
// Depois de girar não dá para girar de novo nem cancelar, só confirmar.
export function Roleta({ visivel, carta, jogadores, valor, onConfirmar, onCancelar }: Props) {
  // O valor animado vive no estado: o React não deixa ler ref durante a renderização.
  const [giro] = useState(() => new Animated.Value(0));
  const rotacao = useRef(0);
  const [fase, setFase] = useState<'pronta' | 'girando' | 'parou'>('pronta');
  const [vencedor, setVencedor] = useState<Jogador | null>(null);

  const n = jogadores.length;
  const largura = 360 / n;

  function girar() {
    if (fase !== 'pronta') return;
    const resultado = sortearGiro(rotacao.current, n);
    rotacao.current = resultado.rotacao;
    setFase('girando');
    Animated.timing(giro, {
      toValue: resultado.rotacao,
      duration: DURACAO_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setVencedor(jogadores[resultado.indice]);
      setFase('parou');
    });
  }

  function fechar(acao: () => void) {
    setFase('pronta');
    setVencedor(null);
    acao();
  }

  const rotate = useMemo(
    () => giro.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' }),
    [giro],
  );

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (fase === 'pronta') fechar(onCancelar);
      }}
    >
      <View style={styles.fundo}>
        <Painel style={styles.painel}>
          <Text style={styles.titulo}>Roleta da sorte</Text>
          <Text style={styles.texto}>
            Repescagem cheia e empate em vagas: a roleta decide quem fica com {carta}.
          </Text>

          <Pressable
            onPress={girar}
            disabled={fase !== 'pronta'}
            accessibilityRole="button"
            accessibilityLabel="Girar a roleta"
            style={styles.roda}
          >
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Svg width={TAMANHO} height={TAMANHO}>
                {jogadores.map((j, i) => {
                  const meio = centroDaFatia(i, n);
                  const rotulo = ponto(meio, RAIO * 0.6);
                  // Texto ao longo do raio, sem ficar de cabeça para baixo na metade esquerda.
                  const giroTexto = meio <= 180 ? meio - 90 : meio + 90;
                  return (
                    <G key={j.id}>
                      <Path
                        d={n === 1 ? '' : fatia(i * largura, (i + 1) * largura)}
                        fill={corDoJogador(j.id)}
                        stroke={cores.fundo}
                        strokeWidth={2}
                      />
                      <SvgText
                        x={rotulo.x}
                        y={rotulo.y}
                        fill={cores.fundo}
                        fontSize={18}
                        fontFamily={fontes.numeroForte}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        transform={`rotate(${giroTexto} ${rotulo.x} ${rotulo.y})`}
                      >
                        {j.nome.length > 10 ? `${j.nome.slice(0, 9)}…` : j.nome}
                      </SvgText>
                    </G>
                  );
                })}
                <Circle cx={CENTRO} cy={CENTRO} r={RAIO} stroke={cores.dourado} strokeWidth={4} fill="none" />
                <Circle cx={CENTRO} cy={CENTRO} r={22} fill={cores.painel} stroke={cores.dourado} strokeWidth={3} />
              </Svg>
            </Animated.View>
            {/* Ponteiro fixo no topo. */}
            <Svg width={30} height={28} style={styles.ponteiro}>
              <Polygon points="2,2 28,2 15,26" fill={cores.douradoClaro} stroke={cores.fundo} strokeWidth={2} />
            </Svg>
          </Pressable>

          {fase === 'parou' && vencedor ? (
            <View style={styles.resultado}>
              <Text style={styles.caiu}>Caiu em {vencedor.nome}!</Text>
              <Text style={styles.texto}>
                Leva {carta} por {formatarReais(valor(vencedor))}.
              </Text>
            </View>
          ) : (
            <Text style={styles.dica}>{fase === 'girando' ? 'Girando…' : 'Toque na roleta ou em Girar'}</Text>
          )}

          {fase === 'parou' && vencedor ? (
            <Botao titulo="Confirmar" onPress={() => fechar(() => onConfirmar(vencedor.id))} />
          ) : (
            <View style={styles.botoes}>
              <Botao titulo="Girar" onPress={girar} desativado={fase !== 'pronta'} style={styles.flex} />
              <Botao
                titulo="Cancelar"
                variante="secundario"
                onPress={() => fechar(onCancelar)}
                desativado={fase !== 'pronta'}
                style={styles.cancelar}
              />
            </View>
          )}
        </Painel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(11,10,16,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  painel: {
    gap: 12,
    alignItems: 'stretch',
  },
  flex: {
    flex: 1,
  },
  titulo: {
    fontFamily: fontes.titulo,
    fontSize: 22,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
  texto: {
    fontFamily: fontes.texto,
    fontSize: 14,
    lineHeight: 20,
    color: cores.texto,
    textAlign: 'center',
  },
  roda: {
    alignSelf: 'center',
    width: TAMANHO,
    height: TAMANHO,
    marginTop: 14,
  },
  ponteiro: {
    position: 'absolute',
    top: -16,
    left: TAMANHO / 2 - 15,
  },
  resultado: {
    alignItems: 'center',
    gap: 2,
  },
  caiu: {
    fontFamily: fontes.tituloPreto,
    fontSize: 26,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
  dica: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  botoes: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelar: {
    width: 124,
    paddingHorizontal: 6,
  },
});
