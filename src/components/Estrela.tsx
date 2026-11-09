import Svg, { Path } from 'react-native-svg';

import { cores } from '@/theme';

// Estrela de quatro pontas do Figma (Início e Resultado).
export function Estrela({ tamanho }: { tamanho: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 30 30">
      <Path
        d="M15 0L17.9698 12.0302L30 15L17.9698 17.9698L15 30L12.0302 17.9698L0 15L12.0302 12.0302L15 0Z"
        fill={cores.douradoClaro}
      />
    </Svg>
  );
}
