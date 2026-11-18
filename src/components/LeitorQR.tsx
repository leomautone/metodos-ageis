import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Botao } from '@/components/Botao';
import { cores, fontes } from '@/theme';

type Props = {
  // Recebe o texto do QR (nas cartas, só o código, ex.: "ANI-011").
  onLer: (texto: string) => void;
  // Desliga a leitura, ex.: depois de reconhecer a carta.
  pausado?: boolean;
  // Aparece atrás da moldura enquanto a câmera não está liberada.
  fundo?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Câmera com a moldura dourada de leitura do Figma.
export function LeitorQR({ onLer, pausado, fundo, style }: Props) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const ultimo = useRef('');

  const liberada = permissao?.granted;

  return (
    <View style={[styles.area, style]}>
      {liberada ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={
            pausado
              ? undefined
              : ({ data }) => {
                  // A câmera repete o mesmo código várias vezes por segundo.
                  if (data === ultimo.current) return;
                  ultimo.current = data;
                  onLer(data);
                }
          }
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.centro]}>{fundo}</View>
      )}

      <View style={styles.moldura} pointerEvents="none">
        <View style={[styles.canto, styles.supEsq]} />
        <View style={[styles.canto, styles.supDir]} />
        <View style={[styles.canto, styles.infEsq]} />
        <View style={[styles.canto, styles.infDir]} />
        <View style={styles.linha} />
      </View>

      {!liberada ? (
        <View style={styles.permissao}>
          <Text style={styles.aviso}>
            {permissao?.canAskAgain === false
              ? 'Câmera bloqueada. Libere nas configurações do celular ou digite o código.'
              : 'O app precisa da câmera para ler o QR da carta.'}
          </Text>
          {permissao?.canAskAgain !== false ? (
            <Botao titulo="Permitir câmera" variante="secundario" onPress={pedirPermissao} style={styles.botao} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const MOLDURA = 240;
const PERNA = 36;
const ESPESSURA = 4;

const styles = StyleSheet.create({
  area: {
    backgroundColor: cores.camera,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moldura: {
    width: MOLDURA,
    height: MOLDURA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canto: {
    position: 'absolute',
    width: PERNA,
    height: PERNA,
    borderColor: cores.dourado,
  },
  supEsq: { top: 0, left: 0, borderTopWidth: ESPESSURA, borderLeftWidth: ESPESSURA, borderTopLeftRadius: 4 },
  supDir: { top: 0, right: 0, borderTopWidth: ESPESSURA, borderRightWidth: ESPESSURA, borderTopRightRadius: 4 },
  infEsq: { bottom: 0, left: 0, borderBottomWidth: ESPESSURA, borderLeftWidth: ESPESSURA, borderBottomLeftRadius: 4 },
  infDir: { bottom: 0, right: 0, borderBottomWidth: ESPESSURA, borderRightWidth: ESPESSURA, borderBottomRightRadius: 4 },
  linha: {
    width: 220,
    height: 2,
    backgroundColor: 'rgba(212,175,55,0.8)',
  },
  permissao: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 16,
    gap: 10,
    alignItems: 'center',
  },
  aviso: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.texto,
    textAlign: 'center',
  },
  botao: {
    alignSelf: 'stretch',
    height: 44,
  },
});
