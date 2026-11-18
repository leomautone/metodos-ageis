import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";
import Svg, {
  Circle,
  G,
  Path,
  Polygon,
  Text as SvgText,
} from "react-native-svg";

import { fatiasPorPeso } from "@/partida/roleta";
import { cores, fontes } from "@/theme";

export type FatiaRoda = {
  chave: string;
  rotulo: string;
  cor: string;
  // Largura (e chance) proporcional ao peso.
  peso: number;
  corTexto?: string;
};

type Props = {
  fatias: FatiaRoda[];
  // Para onde girar (graus acumulados, de sortearGiro/sortearGiroPorPeso); null = parada.
  alvo: number | null;
  onParou: () => void;
  onPress?: () => void;
  desativado?: boolean;
  tamanho?: number;
};

const DURACAO_MS = 4500;

// Roda com ponteiro fixo no topo. Quem decide onde ela para é quem a usa
// (passando `alvo`); a roda só anima até lá e avisa quando parou.
export function Roda({
  fatias,
  alvo,
  onParou,
  onPress,
  desativado,
  tamanho = 280,
}: Props) {
  // O valor animado vive no estado: o React não deixa ler ref durante a renderização.
  const [giro] = useState(() => new Animated.Value(0));
  const avisar = useRef(onParou);
  useEffect(() => {
    avisar.current = onParou;
  }, [onParou]);

  useEffect(() => {
    if (alvo === null) return;
    let terminou = false;
    const terminar = () => {
      if (terminou) return;
      terminou = true;
      giro.setValue(alvo);
      avisar.current();
    };
    Animated.timing(giro, {
      toValue: alvo,
      duration: DURACAO_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) terminar();
    });
    // Garantia: se a animação não avisar o fim (ex.: app em segundo plano),
    // a roda para no lugar sorteado do mesmo jeito.
    const reserva = setTimeout(terminar, DURACAO_MS + 800);
    return () => clearTimeout(reserva);
  }, [alvo, giro]);

  const rotate = useMemo(
    () =>
      giro.interpolate({
        inputRange: [0, 360],
        outputRange: ["0deg", "360deg"],
        extrapolate: "extend",
      }),
    [giro],
  );

  const raio = tamanho / 2 - 6;
  const centro = tamanho / 2;
  const ponto = (angulo: number, r: number) => {
    const rad = (angulo * Math.PI) / 180;
    return { x: centro + r * Math.sin(rad), y: centro - r * Math.cos(rad) };
  };
  const caminho = (inicio: number, fim: number) => {
    const a = ponto(inicio, raio);
    const b = ponto(fim, raio);
    const grande = fim - inicio > 180 ? 1 : 0;
    return `M ${centro} ${centro} L ${a.x} ${a.y} A ${raio} ${raio} 0 ${grande} 1 ${b.x} ${b.y} Z`;
  };
  const angulos = fatiasPorPeso(fatias.map((f) => f.peso));
  // Rótulos menores quando há muitas fatias.
  const fonte = fatias.length > 10 ? 10 : fatias.length > 4 ? 12 : 18;

  return (
    <Pressable
      onPress={onPress}
      disabled={desativado || !onPress}
      accessibilityRole="button"
      accessibilityLabel="Girar a roleta"
      style={[styles.roda, { width: tamanho, height: tamanho }]}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={tamanho} height={tamanho}>
          {fatias.map((f, i) => {
            const { inicio, fim } = angulos[i];
            const meio = (inicio + fim) / 2;
            const rotulo = ponto(meio, raio * 0.62);
            // Texto ao longo do raio, sem ficar de cabeça para baixo na metade esquerda.
            // Fatia fina demais fica sem texto (o item aparece na lista da tela).
            const giroTexto = meio <= 180 ? meio - 90 : meio + 90;
            return (
              <G key={f.chave}>
                {fatias.length === 1 ? (
                  <Circle cx={centro} cy={centro} r={raio} fill={f.cor} />
                ) : (
                  <Path
                    d={caminho(inicio, fim)}
                    fill={f.cor}
                    stroke={cores.fundo}
                    strokeWidth={2}
                  />
                )}
                {fim - inicio < 9 ? null : (
                  <SvgText
                    x={rotulo.x}
                    y={rotulo.y}
                    fill={f.corTexto ?? cores.fundo}
                    fontSize={fonte}
                    fontFamily={fontes.numeroForte}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    transform={`rotate(${giroTexto} ${rotulo.x} ${rotulo.y})`}
                  >
                    {f.rotulo.length > 14
                      ? `${f.rotulo.slice(0, 13)}…`
                      : f.rotulo}
                  </SvgText>
                )}
              </G>
            );
          })}
          <Circle
            cx={centro}
            cy={centro}
            r={raio}
            stroke={cores.dourado}
            strokeWidth={4}
            fill="none"
          />
          <Circle
            cx={centro}
            cy={centro}
            r={22}
            fill={cores.painel}
            stroke={cores.dourado}
            strokeWidth={3}
          />
        </Svg>
      </Animated.View>
      {/* Ponteiro fixo no topo. */}
      <Svg
        width={30}
        height={28}
        style={[styles.ponteiro, { left: tamanho / 2 - 15 }]}
      >
        <Polygon
          points="2,2 28,2 15,26"
          fill={cores.douradoClaro}
          stroke={cores.fundo}
          strokeWidth={2}
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roda: {
    alignSelf: "center",
    marginTop: 14,
  },
  ponteiro: {
    position: "absolute",
    top: -16,
  },
});
