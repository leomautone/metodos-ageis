import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { cores, fontes } from '@/theme';

type Props = {
  segundos: number;
  // Fração do tempo que ainda resta (1 = cheio, 0 = acabou).
  fracao: number;
  urgente?: boolean;
};

const TAMANHO = 124;
const ESPESSURA = 8.68;
const RAIO = (TAMANHO - ESPESSURA) / 2;
const VOLTA = 2 * Math.PI * RAIO;

// Anel do cronômetro do leilão: trilho escuro e arco dourado do tempo restante.
export function Cronometro({ segundos, fracao, urgente }: Props) {
  return (
    <View style={styles.caixa} accessibilityLabel={`${segundos} segundos`}>
      <Svg width={TAMANHO} height={TAMANHO} style={StyleSheet.absoluteFill}>
        <Circle cx={TAMANHO / 2} cy={TAMANHO / 2} r={RAIO} stroke={cores.painelClaro} strokeWidth={ESPESSURA} fill="none" />
        <Circle
          cx={TAMANHO / 2}
          cy={TAMANHO / 2}
          r={RAIO}
          stroke={urgente ? cores.erro : cores.dourado}
          strokeWidth={ESPESSURA}
          fill="none"
          strokeDasharray={`${VOLTA} ${VOLTA}`}
          strokeDashoffset={VOLTA * (1 - Math.max(0, Math.min(1, fracao)))}
          transform={`rotate(-90 ${TAMANHO / 2} ${TAMANHO / 2})`}
        />
      </Svg>
      <Text style={styles.numero}>{segundos}</Text>
      <Text style={styles.rotulo}>SEGUNDOS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    width: TAMANHO,
    height: TAMANHO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: {
    fontFamily: fontes.numeroForte,
    fontSize: 44,
    lineHeight: 54,
    color: cores.douradoClaro,
  },
  rotulo: {
    fontFamily: fontes.numero,
    fontSize: 10,
    letterSpacing: 0.8,
    color: cores.textoSuave,
    marginTop: -4,
  },
});
