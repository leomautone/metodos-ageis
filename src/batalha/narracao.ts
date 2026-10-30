import { buscarPersonagem, type Habitat } from '@/data/personagens';

import type { Evento, Round, Zona } from './motor';

// Narração sem IA: o mesmo conteúdo dos eventos, em texto simples, round a round.
// A narração por IA (SCRUM-27/28) entra no lugar deste texto quando existir.

export const CENARIO: Record<Zona, string> = {
  terra: 'no capim alto da savana',
  agua: 'no lago fundo ligado ao rio',
  ar: 'no céu acima do penhasco',
  neutra: 'na clareira no centro da savana',
};

const CONDICAO: Record<Habitat, string> = {
  terra: 'A terra treme num terremoto, e quem é da terra ganha força.',
  agua: 'Uma enchente invade a clareira, e quem é da água ganha força.',
  ar: 'Um vendaval varre a clareira, e quem voa ganha força.',
};

export function nome(codigo: string | null) {
  return (codigo && buscarPersonagem(codigo)?.nome) || '?';
}

// "Emboscada: +1 no 1º ataque" → "Emboscada"; sem dois-pontos, o texto inteiro.
export function nomeHabilidade(texto: string) {
  const i = texto.indexOf(':');
  return i > 0 ? texto.slice(0, i) : texto;
}

// "Emboscada: +1 no 1º ataque" → "+1 no 1º ataque"; sem dois-pontos, o texto inteiro.
export function efeitoHabilidade(texto: string) {
  const i = texto.indexOf(':');
  return i > 0 ? texto.slice(i + 1).trim() : texto;
}

function texto(codigo: string | null) {
  return (codigo && buscarPersonagem(codigo)?.habilidade?.texto) || null;
}

function efeitoDe(codigo: string | null) {
  return (codigo && buscarPersonagem(codigo)?.habilidade?.efeito.tipo) || null;
}

// Habilidades usadas no evento que pertencem a este personagem.
function habilidadesDe(codigo: string | null, e: Evento) {
  const propria = texto(codigo);
  return e.habilidades_usadas.filter((t) => t === propria);
}

function frase(e: Evento, jogador: (time: number) => string) {
  switch (e.tipo) {
    case 'duelo': {
      const vencedor = e.eliminado === e.alvo ? e.atacante : e.alvo;
      const perdedor = e.eliminado;
      // Cada habilidade usada é do vencedor ou do perdedor; o veneno age depois do duelo.
      const doVencedor = habilidadesDe(vencedor, e);
      const doPerdedor = habilidadesDe(perdedor, e);
      const veneno = efeitoDe(perdedor) === 'veneno' ? doPerdedor[0] : undefined;
      const ajudouPerdedor = doPerdedor.filter((t) => t !== veneno);
      return (
        `${nome(e.atacante)} avança contra ${nome(e.alvo)} ${CENARIO[e.zona ?? 'neutra']}. ` +
        (e.zebra ? `Numa virada histórica, ${nome(vencedor)} leva a melhor` : `${nome(vencedor)} leva a melhor`) +
        (doVencedor.length ? ` com ${doVencedor.map(nomeHabilidade).join(' e ')}` : '') +
        (ajudouPerdedor.length ? `, nem ${ajudouPerdedor.map(nomeHabilidade).join(' e ')} salva ${nome(perdedor)}` : '') +
        `, e ${nome(perdedor)} cai.` +
        (veneno ? ` Mas o veneno fica: ${nome(vencedor)} sai enfraquecido.` : '')
      );
    }
    case 'esquiva':
      return `${nome(e.alvo)} escapa do ataque de ${nome(e.atacante)} com ${nomeHabilidade(e.habilidades_usadas[0] ?? '')}.`;
    case 'ultima_resistencia':
      return `${nome(e.atacante)} é o último de pé do time de ${jogador(e.time ?? 0)} e vai lutar com tudo.`;
    case 'arena_fecha':
      return 'A arena se fecha: os sobreviventes se encontram na clareira no centro da savana.';
    case 'condicao_final':
      return e.zona && e.zona !== 'neutra' ? CONDICAO[e.zona] : '';
    case 'vencedor':
      return '';
  }
}

export function narrarRound(eventos: Evento[], round: Round, jogador: (time: number) => string) {
  const doRound = eventos.filter((e) => e.round === round && e.tipo !== 'vencedor');
  if (doRound.length === 0) return 'Ninguém arrisca um ataque. Os animais se estudam, à espera de um erro.';
  const texto = doRound.map((e) => frase(e, jogador)).filter(Boolean).join(' ');
  return round === 'final' ? texto : `${texto} O round termina, e ninguém respira tranquilo.`;
}
