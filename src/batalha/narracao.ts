import { buscarPersonagem, type Habitat } from '@/data/personagens';

import type { Evento, Round, Zona } from './motor';

// Narração épica (e um pouco cômica) da batalha, montada a partir dos eventos.
// Não usa IA: as frases saem de listas, escolhidas de forma fixa para cada
// evento, então reabrir um round mostra sempre o mesmo texto.

export type Bloco = {
  texto: string;
  // Nos combates: quem foi eliminado, para fechar com "Fulano FORA!".
  fora?: string;
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

// Escolhe sempre a mesma frase para a mesma chave (hash simples da chave).
function escolher(opcoes: string[], chave: string) {
  let h = 0;
  for (let i = 0; i < chave.length; i++) h = (h * 31 + chave.charCodeAt(i)) >>> 0;
  return opcoes[h % opcoes.length];
}

function preencher(modelo: string, valores: Record<string, string>) {
  return modelo.replace(/\{(\w+)\}/g, (_, k: string) => valores[k] ?? '');
}

const LOCAL: Record<Zona, string[]> = {
  terra: ['no capim alto da savana', 'entre os cupinzeiros da savana', 'na terra rachada da savana'],
  agua: ['nas águas escuras do lago fundo', 'na correnteza do rio', 'no meio do lago, espirrando água até nas nuvens'],
  ar: ['no céu acima do penhasco', 'entre as nuvens do penhasco', 'lá no alto, onde até as águias ficam tontas'],
  neutra: ['na clareira no centro da savana', 'no meio da clareira, sem lugar para fugir'],
};

const ABERTURA = [
  'Round {n}! Os tambores da savana rufam e até as nuvens param para assistir.',
  'Round {n}! Um trovão corta o céu: os deuses da natureza puxaram as cadeiras.',
  'Round {n}! As hienas da arquibancada começam a gargalhar de nervoso.',
  'Round {n}! O vento sopra um aviso: hoje alguém volta para casa mais cedo.',
];

const ABERTURA_FINAL = 'O DUELO FINAL! O sol se esconde atrás das nuvens, que não querem ver o que vem por aí.';

const ATAQUE = [
  '{A} avança sobre {B} {local} com a fúria de mil tempestades.',
  '{A} encara {B} {local} e solta um urro que faz as pedras pedirem desculpas.',
  '{A} parte para cima de {B} {local} como quem esqueceu o medo em casa.',
  '{A} desafia {B} {local} para um duelo digno de lenda (e de meme).',
  '{A} estala o pescoço, olha para {B} e decide que hoje é dia de confusão {local}.',
];

const HABILIDADE_VENCEDOR = [
  '{V} tira {hab} da cartola como um mágico de circo!',
  'E então: {hab}! {V} brilha como se tivesse engolido o sol.',
  '{hab} entra em cena, e {V} vira uma força da natureza!',
];

const HABILIDADE_PERDEDOR = [
  '{P} ainda tenta {hab}, mas a sorte já tinha saído para almoçar.',
  'Nem {hab} salva {P} desta vez.',
];

const VITORIA = [
  '{V} é mais forte e prova isso sem pedir licença.',
  'Poeira sobe, penas voam, e quando tudo baixa, {V} está de pé.',
  'Foi rápido, foi bonito, foi {V}.',
  '{V} desfere o golpe final com um estilo que merecia aplausos de pé.',
];

const ZEBRA = [
  'VIRADA HISTÓRICA! Ninguém apostava um grão de milho em {V}, mas os deuses da savana estavam de bom humor!',
  'Os bardos vão cantar isto por séculos: {V}, o azarão, derruba o favorito!',
  'Inacreditável! {V} vence contra todas as probabilidades e ainda dá uma piscadinha para a plateia.',
];

const VENENO = [
  'Mas o veneno fica no ar: {V} sai cambaleando, meio verde, mais fraco até o fim da batalha.',
  'Só que a mordida venenosa cobra o preço: {V} vence, mas fica zonzo até o fim.',
];

const ESQUIVA = [
  '{A} ataca com tudo... e acerta o vento! {B} escapa com {hab} e ainda faz pose para a plateia.',
  '{A} mira, salta, golpeia... o nada. {B} já tinha sumido com {hab}.',
];

const ULTIMA_RESISTENCIA = [
  '{X} olha para os lados e percebe: está sozinho pelo time de {J}. Os olhos brilham. A ÚLTIMA RESISTÊNCIA começou!',
  'Sozinho pelo time de {J}, {X} respira fundo e promete vender caro a própria pele.',
];

const ARENA_FECHA =
  'A savana inteira treme e se fecha como um anfiteatro: os sobreviventes são arrastados para a clareira. Não há mais onde se esconder!';

const CONDICAO: Record<Habitat, string> = {
  terra: 'Um TERREMOTO sacode a clareira! Quem é da terra finca as patas no chão e parece crescer de tamanho.',
  agua: 'Uma ENCHENTE invade a clareira! Quem é da água sorri, porque agora está em casa.',
  ar: 'Um VENDAVAL varre a clareira! Quem voa abre as asas e ri da cara de quem não voa.',
};

const FECHAMENTO = [
  'O round termina. Alguém na plateia desmaia de emoção.',
  'Fim do round! Os sobreviventes se olham, ofegantes, e ninguém pisca.',
  'O sino toca. A poeira ainda não baixou e já tem gente roendo as unhas.',
  'Round encerrado. O suspense é tanto que até a lua resolveu aparecer mais cedo.',
];

const SEM_ATAQUE =
  'Ninguém ataca. Os animais se medem, se estudam, e um mosquito passa de raspão. Que tensão!';

// Habilidades usadas no evento que pertencem a este personagem.
function habilidadesDe(codigo: string | null, e: Evento) {
  const propria = codigo ? buscarPersonagem(codigo)?.habilidade?.texto : undefined;
  return e.habilidades_usadas.filter((t) => t === propria);
}

function narrarDuelo(e: Evento, chave: string): Bloco {
  const vencedorCodigo = e.eliminado === e.alvo ? e.atacante : e.alvo;
  const perdedorCodigo = e.eliminado;
  const V = nome(vencedorCodigo);
  const P = nome(perdedorCodigo);
  const local = escolher(LOCAL[e.zona ?? 'neutra'], chave);
  const frases = [preencher(escolher(ATAQUE, chave), { A: nome(e.atacante), B: nome(e.alvo), local })];

  for (const hab of habilidadesDe(vencedorCodigo, e)) {
    frases.push(preencher(escolher(HABILIDADE_VENCEDOR, chave + hab), { V, hab: nomeHabilidade(hab) }));
  }
  // O veneno do perdedor age depois do duelo, então não conta como ajuda nem como tentativa.
  const venenoso = buscarPersonagem(perdedorCodigo ?? '')?.habilidade?.efeito.tipo === 'veneno';
  const doPerdedor = habilidadesDe(perdedorCodigo, e);
  for (const hab of venenoso ? [] : doPerdedor) {
    frases.push(preencher(escolher(HABILIDADE_PERDEDOR, chave + hab), { P, hab: nomeHabilidade(hab) }));
  }

  frases.push(preencher(escolher(e.zebra ? ZEBRA : VITORIA, chave), { V }));
  if (venenoso && doPerdedor.length > 0) frases.push(preencher(escolher(VENENO, chave), { V }));

  return { texto: frases.join(' '), fora: P };
}

function narrarEvento(e: Evento, chave: string, jogador: (time: number) => string): Bloco | null {
  switch (e.tipo) {
    case 'duelo':
      return narrarDuelo(e, chave);
    case 'esquiva':
      return {
        texto: preencher(escolher(ESQUIVA, chave), {
          A: nome(e.atacante),
          B: nome(e.alvo),
          hab: nomeHabilidade(e.habilidades_usadas[0] ?? ''),
        }),
      };
    case 'ultima_resistencia':
      return { texto: preencher(escolher(ULTIMA_RESISTENCIA, chave), { X: nome(e.atacante), J: jogador(e.time ?? 0) }) };
    case 'arena_fecha':
      return { texto: ARENA_FECHA };
    case 'condicao_final':
      return e.zona && e.zona !== 'neutra' ? { texto: CONDICAO[e.zona] } : null;
    case 'vencedor':
      return e.time
        ? { texto: `E quando a poeira finalmente baixa, só o time de ${jogador(e.time)} continua de pé! GLÓRIA ETERNA!` }
        : null;
  }
}

// A narração de um round em blocos: abertura, um bloco por evento e o fechamento.
// O último round termina com o anúncio do vencedor em vez do suspense.
export function narrarRound(eventos: Evento[], round: Round, jogador: (time: number) => string): Bloco[] {
  const doRound = eventos.filter((e) => e.round === round);
  const abertura = round === 'final' ? ABERTURA_FINAL : preencher(escolher(ABERTURA, `abre${round}`), { n: String(round) });
  const blocos: Bloco[] = [{ texto: abertura }];

  if (!doRound.some((e) => e.tipo !== 'vencedor')) blocos.push({ texto: SEM_ATAQUE });

  doRound.forEach((e, i) => {
    const bloco = narrarEvento(e, `${round}-${i}-${e.atacante ?? ''}-${e.alvo ?? ''}`, jogador);
    if (bloco) blocos.push(bloco);
  });

  if (!doRound.some((e) => e.tipo === 'vencedor')) {
    blocos.push({ texto: escolher(FECHAMENTO, `fecha${round}`) });
  }
  return blocos;
}
