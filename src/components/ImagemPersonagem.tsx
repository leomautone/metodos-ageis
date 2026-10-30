import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { IMAGENS } from '@/data/imagens';
import { buscarPersonagem } from '@/data/personagens';
import { cores, fontes } from '@/theme';

type Props = {
  codigo: string;
  style?: StyleProp<ViewStyle>;
  // Escurece a imagem, ex.: personagem eliminado na batalha.
  apagada?: boolean;
};

// Ilustração do personagem. Sem imagem, mostra a inicial no lugar.
// Usa expo-image: reduz a ilustração ao tamanho da tela, guarda em cache e
// não troca a imagem errada quando a lista recicla as linhas.
export function ImagemPersonagem({ codigo, style, apagada }: Props) {
  const fonte = IMAGENS[codigo];
  const nome = buscarPersonagem(codigo)?.nome ?? codigo;
  return (
    <View style={[styles.caixa, style]}>
      {fonte ? (
        <Image
          source={fonte}
          style={styles.imagem}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={codigo}
          transition={120}
          accessibilityLabel={nome}
        />
      ) : (
        <View style={styles.marcador}>
          <Text style={styles.inicial} adjustsFontSizeToFit numberOfLines={1}>
            {nome.charAt(0)}
          </Text>
        </View>
      )}
      {apagada ? <View style={styles.sombra} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    overflow: 'hidden',
    backgroundColor: cores.painelClaro,
  },
  imagem: {
    width: '100%',
    height: '100%',
  },
  marcador: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: cores.douradoEscuro,
    borderRadius: 8,
  },
  inicial: {
    fontFamily: fontes.titulo,
    fontSize: 22,
    color: cores.douradoEscuro,
  },
  sombra: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
