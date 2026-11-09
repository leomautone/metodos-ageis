// Identidade visual do protótipo no Figma (All-in Draft — Cartas e Moedas).

export const cores = {
  fundo: '#15131C',
  painel: '#1F1C28',
  painelClaro: '#2A2634',
  camera: '#0B0A10',
  dourado: '#D4AF37',
  douradoClaro: '#F3DC8B',
  douradoEscuro: '#8C6B1F',
  texto: '#E9E4D8',
  textoSuave: '#A69F8F',
  textoApagado: '#6F6880',
  desativado: '#4A4655',
  sucesso: '#6FBF73',
  erro: '#E07A6A',
  zebra: '#D0624A',
  zebraTexto: '#FFF4E8',
  habitat: {
    terra: '#4E9A5A',
    agua: '#2F7FC1',
    ar: '#A9D3EE',
  },
  // Cor de cada jogador, na ordem em que entram na partida.
  // As quatro primeiras vêm do Figma; a quinta foi escolhida para combinar.
  jogadores: ['#D4AF37', '#7FB3D5', '#C39BD3', '#82C99A', '#E59866'],
} as const;

export const fontes = {
  titulo: 'Cinzel_700Bold',
  tituloPreto: 'Cinzel_900Black',
  numero: 'Oswald_500Medium',
  numeroForte: 'Oswald_700Bold',
  texto: 'Inter_400Regular',
  textoItalico: 'Inter_400Regular_Italic',
  textoMedio: 'Inter_500Medium',
  textoForte: 'Inter_600SemiBold',
} as const;

export const espaco = {
  p: 8,
  m: 16,
  g: 24,
} as const;

export function corDoJogador(id: number) {
  return cores.jogadores[(id - 1) % cores.jogadores.length];
}
