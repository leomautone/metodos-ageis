// Identidade visual igual às cartas impressas.

export const cores = {
  fundo: '#15131C',
  painel: '#1F1C28',
  dourado: '#D4AF37',
  douradoClaro: '#F3DC8B',
  texto: '#E9E4D8',
  textoSuave: '#A9A397',
  desativado: '#4A4655',
  habitat: {
    terra: '#4E9A5A',
    agua: '#2F7FC1',
    ar: '#A9D3EE',
  },
} as const;

export const fontes = {
  titulo: 'Cinzel_700Bold',
  tituloRegular: 'Cinzel_400Regular',
  numero: 'Oswald_500Medium',
  texto: 'Inter_400Regular',
  textoForte: 'Inter_600SemiBold',
} as const;

export const espaco = {
  p: 8,
  m: 16,
  g: 24,
} as const;
