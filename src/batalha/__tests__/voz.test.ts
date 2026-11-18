import { describe, expect, it } from '@jest/globals';
import { VoiceQuality, type Voice } from 'expo-speech';

import { qualidadeDaVoz, vozAutomatica, vozesEmPortugues } from '../voz';
import { textoParaIA } from '../vozIA';

const v = (identifier: string, name: string, language = 'pt-BR', quality = VoiceQuality.Default): Voice => ({
  identifier,
  name,
  language,
  quality,
});

const vozes = [
  v('com.apple.eloquence.pt-BR.Eddy', 'Eddy'),
  v('com.apple.voice.compact.pt-BR.Luciana', 'Luciana'),
  v('com.apple.voice.compact.pt-PT.Joana', 'Joana', 'pt-PT'),
  v('com.apple.voice.premium.pt-BR.Luciana', 'Luciana', 'pt-BR', VoiceQuality.Enhanced),
  v('com.apple.voice.enhanced.pt-BR.Felipe', 'Felipe', 'pt-BR', VoiceQuality.Enhanced),
  v('com.apple.voice.compact.en-US.Samantha', 'Samantha', 'en-US'),
];

describe('vozes do narrador', () => {
  it('reconhece a qualidade pelo identificador', () => {
    expect(qualidadeDaVoz(vozes[0])).toBe('Robótica');
    expect(qualidadeDaVoz(vozes[1])).toBe('Padrão');
    expect(qualidadeDaVoz(vozes[3])).toBe('Premium');
    expect(qualidadeDaVoz(vozes[4])).toBe('Aprimorada');
  });

  it('só português, Brasil primeiro, das melhores para as piores', () => {
    expect(vozesEmPortugues(vozes).map((x) => `${x.nome} ${x.qualidade}`)).toEqual([
      'Luciana Premium',
      'Felipe Aprimorada',
      'Luciana Padrão',
      'Eddy Robótica',
      'Joana Padrão',
    ]);
  });

  it('a escolha automática nunca é uma voz robótica', () => {
    expect(vozAutomatica(vozesEmPortugues(vozes))).toBe('com.apple.voice.premium.pt-BR.Luciana');
    expect(vozAutomatica(vozesEmPortugues([vozes[0]]))).toBeUndefined();
  });
});

describe('texto da voz de IA', () => {
  it('nos combates, o FORA! vem no mesmo áudio, depois de uma pausa', () => {
    expect(textoParaIA({ texto: 'O Leão vence.' })).toBe('O Leão vence.');
    expect(textoParaIA({ texto: 'O Leão vence.', fora: 'Puma' })).toBe('O Leão vence. ... Puma... FORA!');
  });
});
