import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { cores, fontes } from '@/theme';

type Props = {
  segundos: number;
  // Fração do tempo que ainda resta (1 = cheio, 0 = acabou).
  fracao: number;
  urgente?: boolean;
  // 124 no Figma; maior quando o relógio é o centro da tela.
  tamanho?: number;
};

// Anel do cronômetro do leilão: trilho escuro e arco dourado do tempo restante.
// Espessura e fontes crescem na proporção do Figma (124 px).
export function Cronometro({ segundos, fracao, urgente, tamanho = 124 }: Props) {
  const escala = tamanho / 124;
  const espessura = 8.68 * escala;
  const raio = (tamanho - espessura) / 2;
  const volta = 2 * Math.PI * raio;
  const centro = tamanho / 2;
  return (
    <View style={[styles.caixa, { width: tamanho, height: tamanho }]} accessibilityLabel={`${segundos} segundos`}>
      <Svg width={tamanho} height={tamanho} style={StyleSheet.absoluteFill}>
        <Circle cx={centro} cy={centro} r={raio} stroke={cores.painelClaro} strokeWidth={espessura} fill="none" />
        <Circle
          cx={centro}
          cy={centro}
          r={raio}
          stroke={urgente ? cores.erro : cores.dourado}
          strokeWidth={espessura}
          fill="none"
          strokeDasharray={`${volta} ${volta}`}
          strokeDashoffset={volta * (1 - Math.max(0, Math.min(1, fracao)))}
          transform={`rotate(-90 ${centro} ${centro})`}
        />
      </Svg>
      <Text style={[styles.numero, { fontSize: 44 * escala, lineHeight: 54 * escala }]}>{segundos}</Text>
      <Text style={[styles.rotulo, { fontSize: 10 * escala, letterSpacing: 0.8 * escala }]}>SEGUNDOS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: {
    fontFamily: fontes.numeroForte,
    color: cores.douradoClaro,
  },
  rotulo: {
    fontFamily: fontes.numero,
    color: cores.textoSuave,
    marginTop: -4,
  },
});
