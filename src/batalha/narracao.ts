import { buscarPersonagem, type Habitat } from "@/data/personagens";

import { criarAleatorio, type Evento, type Round, type Zona } from "./motor";

// Narração épica (e cômica) da batalha, montada a partir dos eventos, sem IA.
// É a reserva quando a IA não responde. As frases saem de listas grandes; a
// escolha depende da batalha inteira (cada partida conta a história de um jeito)
// e não repete a mesma frase dentro de um round. Reabrir o round mostra o mesmo texto.

export type Bloco = {
  texto: string;
  // Nos combates: quem foi eliminado, para fechar com "Fulano FORA!".
  fora?: string;
};

export function nome(codigo: string | null | undefined) {
  return (codigo && buscarPersonagem(codigo)?.nome) || "?";
}

// "Emboscada: +1 no 1º ataque" → "Emboscada"; sem dois-pontos, o texto inteiro.
export function nomeHabilidade(texto: string) {
  const i = texto.indexOf(":");
  return i > 0 ? texto.slice(0, i) : texto;
}

// "Emboscada: +1 no 1º ataque" → "+1 no 1º ataque"; sem dois-pontos, o texto inteiro.
export function efeitoHabilidade(texto: string) {
  const i = texto.indexOf(":");
  return i > 0 ? texto.slice(i + 1).trim() : texto;
}

function hash(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++)
    h = Math.imul(h ^ texto.charCodeAt(i), 16777619) >>> 0;
  return h;
}

// Sorteador de frases de um round: mesma batalha + mesmo round = mesmas frases;
// dentro do round, não repete uma frase da mesma lista até a lista acabar.
function criarSorteador(eventos: Evento[], round: Round) {
  const assinatura = eventos
    .map((e) => `${e.round}${e.tipo}${e.atacante}${e.alvo}${e.eliminado}`)
    .join("|");
  const aleatorio = criarAleatorio(hash(`${assinatura}#${round}`));
  const usadas = new Map<string[], Set<number>>();
  return {
    frase(lista: string[]) {
      let livres = usadas.get(lista) ?? new Set<number>();
      if (livres.size >= lista.length) livres = new Set();
      const opcoes = lista.map((_, i) => i).filter((i) => !livres.has(i));
      const i = opcoes[Math.floor(aleatorio() * opcoes.length)];
      livres.add(i);
      usadas.set(lista, livres);
      return lista[i];
    },
    chance(p: number) {
      return aleatorio() < p;
    },
  };
}
type Sorteador = ReturnType<typeof criarSorteador>;

function preencher(modelo: string, valores: Record<string, string>) {
  return modelo.replace(/\{(\w+)\}/g, (_, k: string) => valores[k] ?? "");
}

const LOCAL: Record<Zona, string[]> = {
  terra: [
    "no capim alto da savana",
    "entre os cupinzeiros da savana",
    "na terra rachada da savana",
    "debaixo da sombra de um baobá milenar",
    "numa nuvem de poeira vermelha da savana",
    "à beira de uma trilha de elefantes",
  ],
  agua: [
    "nas águas escuras do lago fundo",
    "na correnteza do rio",
    "no meio do lago, espirrando água até nas nuvens",
    "entre os juncos da margem do lago",
    "nas profundezas onde a luz não chega",
    "numa cachoeira que despenca do penhasco",
  ],
  ar: [
    "no céu acima do penhasco",
    "entre as nuvens do penhasco",
    "lá no alto, onde até as águias ficam tontas",
    "num redemoinho de vento acima das rochas",
    "rasgando o céu alaranjado do entardecer",
  ],
  neutra: [
    "na clareira no centro da savana",
    "no meio da clareira, sem lugar para fugir",
    "no círculo de pedras da clareira",
    "no centro da clareira, sob os olhos de todos",
  ],
};

const ABERTURA = [
  "Round {n}! Os tambores da savana rufam e até as nuvens param para assistir.",
  "Round {n}! Um trovão corta o céu: os deuses da natureza puxaram as cadeiras.",
  "Round {n}! As hienas da arquibancada começam a gargalhar de nervoso.",
  "Round {n}! O vento sopra um aviso: hoje alguém volta para casa mais cedo.",
  "Round {n}! Um bando de flamingos levanta voo de uma vez só. Mau sinal.",
  "Round {n}! O sol bate no penhasco e os olhos de cada fera brilham como brasa.",
  "Round {n}! Os macacos-prego vendem pipoca na copa das árvores. O espetáculo vai começar.",
  "Round {n}! Um silêncio pesado cai sobre a savana. Nem os grilos se atrevem a cantar.",
  "Round {n}! Os anciões da tribo dos elefantes batem as patas: a lenda continua.",
  "Round {n}! Até o rio parece correr mais devagar para não perder nada.",
  "Round {n}! Os urubus já sobrevoam a arena em círculos. Eles sabem de alguma coisa.",
  "Round {n}! O cheiro de chuva e de confusão toma conta do ar.",
];

const ABERTURA_FINAL = [
  "O DUELO FINAL! O sol se esconde atrás das nuvens, que não querem ver o que vem por aí.",
  "O DUELO FINAL! A lua aparece em pleno dia só para testemunhar o desfecho.",
  "O DUELO FINAL! Os bardos afinam os alaúdes: o último capítulo vai ser escrito agora.",
  "O DUELO FINAL! A savana inteira prende a respiração. Só um time sai daqui com glória.",
];

const ATAQUE = [
  "{A} avança sobre {B} {local} com a fúria de mil tempestades.",
  "{A} encara {B} {local} e solta um urro que faz as pedras pedirem desculpas.",
  "{A} parte para cima de {B} {local} como quem esqueceu o medo em casa.",
  "{A} desafia {B} {local} para um duelo digno de lenda (e de meme).",
  "{A} estala o pescoço, olha para {B} e decide que hoje é dia de confusão {local}.",
  "{A} surge do nada {local} e cai em cima de {B} como um raio de verão.",
  "{A} anda em círculos em volta de {B} {local}, calculando cada passo.",
  "Sem aviso, {A} dispara contra {B} {local}. A plateia derruba a pipoca.",
  '{A} aponta para {B} {local}, como quem diz: "você é o próximo".',
  "{A} e {B} se encontram {local}. Os olhares se cruzam. Faíscas!",
  "{A} sente cheiro de vitória {local} e vai tirar satisfação com {B}.",
  "{B} achava que estava em paz {local}, até {A} aparecer com cara de poucos amigos.",
];

const ACAO: Record<Zona, string[]> = {
  terra: [
    "Patas cravam no chão, o capim voa longe e a terra treme a cada investida.",
    "Os dois rolam numa bola de poeira, garras e rugidos.",
    "Um galho se parte, uma pedra rola, e o choque ecoa até o horizonte.",
    "Uma manada de gnus muda de rota só para não se meter na confusão.",
  ],
  agua: [
    "A água ferve de bolhas e espuma, e ondas lambem a margem.",
    "Os dois somem no fundo do lago e, por um instante, só se vê redemoinho.",
    "Um jato d'água sobe tão alto que molha os espectadores do penhasco.",
    "Peixes fogem em cardume, desesperados, enquanto o lago vira tempestade.",
  ],
  ar: [
    "Penas voam como confete e os dois giram em parafuso entre as nuvens.",
    "Um rasante corta o ar com um assobio que arrepia a savana inteira.",
    "Lá em cima, o vento uiva e os dois trocam golpes em queda livre.",
    "As nuvens se abrem e se fecham em volta dos dois, como cortinas de um teatro.",
  ],
  neutra: [
    "Não há onde se esconder: é golpe contra golpe, olho no olho.",
    "A clareira vira um redemoinho de poeira, pelos e coragem.",
    "Cada golpe estala como trovão no meio da clareira.",
    "O círculo de pedras treme. A plateia grita sem saber para quem torcer.",
  ],
};

const HABILIDADE_VENCEDOR = [
  "{V} tira {hab} da cartola como um mágico de circo!",
  "E então: {hab}! {V} brilha como se tivesse engolido o sol.",
  "{hab} entra em cena, e {V} vira uma força da natureza!",
  "É a hora de {hab}! {V} revela o truque que guardava desde o draft.",
  "{V} usa {hab} e a plateia vai ao delírio!",
];

const HABILIDADE_PERDEDOR = [
  "{P} ainda tenta {hab}, mas a sorte já tinha saído para almoçar.",
  "Nem {hab} salva {P} desta vez.",
  "{P} aposta tudo em {hab}... e não é o bastante.",
];

const VITORIA = [
  "{V} é mais forte e prova isso sem pedir licença.",
  "Poeira sobe, penas voam, e quando tudo baixa, {V} está de pé.",
  "Foi rápido, foi bonito, foi {V}.",
  "{V} desfere o golpe final com um estilo que merecia aplausos de pé.",
  "{V} finaliza com uma elegância que faria um leopardo chorar de inveja.",
  "Quando o barulho para, só um vulto continua de pé: {V}.",
  "{V} vence e ainda arruma o pelo como se nada tivesse acontecido.",
  "Golpe certeiro! {V} manda {P} direto para as histórias de fogueira.",
  "{P} lutou com honra, mas {V} estava num dia inspirado.",
  "Um último golpe, um baque surdo, e {V} ergue a cabeça vitorioso.",
];

const ZEBRA = [
  "VIRADA HISTÓRICA! Ninguém apostava um grão de milho em {V}, mas os deuses da savana estavam de bom humor!",
  "Os bardos vão cantar isto por séculos: {V}, o azarão, derruba o favorito!",
  "Inacreditável! {V} vence contra todas as probabilidades e ainda dá uma piscadinha para a plateia.",
  "ZEBRA! E não é a do bando: {V} derruba {P}, e as apostas da savana viram pó!",
  "O impossível aconteceu! {P} era favorito, mas {V} não leu o roteiro.",
];

const PLATEIA = [
  "Na arquibancada, um suricato desmaia de emoção.",
  "Os papagaios já espalham a notícia pela floresta inteira.",
  'Um velho crocodilo comenta: "no meu tempo, era assim mesmo".',
  "Os urubus anotam mais um nome na lista.",
  "Uma hiena ri tanto que precisa ser carregada para fora.",
];

const VENENO = [
  "Mas o veneno fica no ar: {V} sai cambaleando, meio verde, mais fraco até o fim da batalha.",
  "Só que a mordida venenosa cobra o preço: {V} vence, mas fica zonzo até o fim.",
  "O veneno, porém, já corre nas veias de {V}. A vitória teve gosto amargo.",
];

const VIDA_EXTRA = [
  "{P} cai... e por um segundo a savana inteira se cala. Então uma luz dourada desce do céu: É A VIDA EXTRA! {P} se levanta, sacode a poeira e volta para a luta!",
  "Parecia o fim de {P}. Parecia. Uma bênção antiga brilha no peito da fera, e {P} renasce como uma fênix da savana!",
  "{V} já comemorava, mas {P} abre os olhos: a VIDA EXTRA foi gasta, e a lenda continua!",
];

const BAIXA = [
  "Antes do primeiro rugido, uma maldição cai sobre o time de {J}: {X} tropeça numa raiz amaldiçoada e sai da arena mancando.",
  "O destino é cruel com o time de {J}: {X} é atingido por um raio caído do céu limpo e não vai lutar hoje.",
  "Uma névoa sombria envolve {X}, do time de {J}. Quando ela se dissipa, a fera já foi embora. Maldição!",
];

const ESQUIVA = [
  "{A} ataca com tudo... e acerta o vento! {B} escapa com {hab} e ainda faz pose para a plateia.",
  "{A} mira, salta, golpeia... o nada. {B} já tinha sumido com {hab}.",
  "{A} chega com tudo, mas {B} usa {hab} e some como fumaça. Que vergonha para {A}!",
  "{B} dança para o lado com {hab}, e {A} passa direto, abraçando uma árvore.",
];

const ULTIMA_RESISTENCIA = [
  "{X} olha para os lados e percebe: está sozinho pelo time de {J}. Os olhos brilham. A ÚLTIMA RESISTÊNCIA começou!",
  "Sozinho pelo time de {J}, {X} respira fundo e promete vender caro a própria pele.",
  "Os companheiros caíram. {X} carrega agora todo o orgulho do time de {J}. ÚLTIMA RESISTÊNCIA!",
  "{X} solta um grito que ecoa pelo penhasco: o time de {J} ainda não acabou!",
];

const ARENA_FECHA = [
  "A savana inteira treme e se fecha como um anfiteatro: os sobreviventes são arrastados para a clareira. Não há mais onde se esconder!",
  "Muralhas de pedra brotam do chão e cercam a clareira. Terra, água e céu agora são um lugar só!",
  "Os deuses da natureza cansaram de esperar: a arena encolhe até virar uma clareira. Todos se alcançam!",
];

const CONDICAO: Record<Habitat, string[]> = {
  terra: [
    "Um TERREMOTO sacode a clareira! Quem é da terra finca as patas no chão e parece crescer de tamanho.",
    "O chão se abre em rachaduras e ronca como um gigante acordando: TERREMOTO! As feras da terra sorriem.",
  ],
  agua: [
    "Uma ENCHENTE invade a clareira! Quem é da água sorri, porque agora está em casa.",
    "O rio transborda e engole a clareira: ENCHENTE! Quem nada se sente invencível.",
  ],
  ar: [
    "Um VENDAVAL varre a clareira! Quem voa abre as asas e ri da cara de quem não voa.",
    "O céu escurece e um VENDAVAL arranca o capim pela raiz! Quem tem asas domina a arena.",
  ],
};

const ESCOLHA_TERRENO =
  "Foi {J} quem escolheu este destino, com a bênção do Senhor da Arena!";

const FECHAMENTO = [
  "O round termina. Alguém na plateia desmaia de emoção.",
  "Fim do round! Os sobreviventes se olham, ofegantes, e ninguém pisca.",
  "O sino toca. A poeira ainda não baixou e já tem gente roendo as unhas.",
  "Round encerrado. O suspense é tanto que até a lua resolveu aparecer mais cedo.",
  "Fim do round. As feras lambem as feridas e afiam as garras para o que vem.",
  "O round acaba, mas ninguém relaxa: o próximo promete ser ainda pior.",
  "Silêncio. Só se ouve a respiração pesada dos que ainda estão de pé.",
];

const SEM_ATAQUE = [
  "Ninguém ataca. Os animais se medem, se estudam, e um mosquito passa de raspão. Que tensão!",
  "Ninguém se arrisca. As feras rosnam de longe, cada uma esperando o erro da outra.",
];

const VENCEDOR = [
  "E quando a poeira finalmente baixa, só o time de {J} continua de pé! GLÓRIA ETERNA!",
  "Acabou! O time de {J} reina sobre a savana, e os bardos já começam a compor a canção!",
  "VITÓRIA! O nome do time de {J} será gravado nas pedras do penhasco para sempre!",
];

// Habilidades usadas no evento que pertencem a este personagem.
function habilidadesDe(codigo: string | null, e: Evento) {
  const propria = codigo
    ? buscarPersonagem(codigo)?.habilidade?.texto
    : undefined;
  return e.habilidades_usadas.filter((t) => t === propria);
}

function narrarCombate(e: Evento, s: Sorteador): Bloco {
  const salvo = e.tipo === "vida_extra";
  const perdedorCodigo = salvo ? (e.salvo ?? null) : e.eliminado;
  const vencedorCodigo = perdedorCodigo === e.alvo ? e.atacante : e.alvo;
  const V = nome(vencedorCodigo);
  const P = nome(perdedorCodigo);
  const zona = e.zona ?? "neutra";
  const frases = [
    preencher(s.frase(ATAQUE), {
      A: nome(e.atacante),
      B: nome(e.alvo),
      local: s.frase(LOCAL[zona]),
    }),
    s.frase(ACAO[zona]),
  ];

  for (const hab of habilidadesDe(vencedorCodigo, e)) {
    frases.push(
      preencher(s.frase(HABILIDADE_VENCEDOR), { V, hab: nomeHabilidade(hab) }),
    );
  }
  // O veneno do perdedor age depois do duelo, então não conta como ajuda nem como tentativa.
  const venenoso =
    buscarPersonagem(perdedorCodigo ?? "")?.habilidade?.efeito.tipo ===
    "veneno";
  const doPerdedor = habilidadesDe(perdedorCodigo, e);
  for (const hab of venenoso ? [] : doPerdedor) {
    frases.push(
      preencher(s.frase(HABILIDADE_PERDEDOR), { P, hab: nomeHabilidade(hab) }),
    );
  }

  if (salvo) {
    frases.push(preencher(s.frase(VIDA_EXTRA), { V, P }));
    return { texto: frases.join(" ") };
  }

  frases.push(preencher(s.frase(e.zebra ? ZEBRA : VITORIA), { V, P }));
  if (venenoso && doPerdedor.length > 0)
    frases.push(preencher(s.frase(VENENO), { V }));
  if (s.chance(0.35)) frases.push(s.frase(PLATEIA));

  return { texto: frases.join(" "), fora: P };
}

function narrarEvento(
  e: Evento,
  s: Sorteador,
  jogador: (time: number) => string,
): Bloco | null {
  switch (e.tipo) {
    case "duelo":
    case "vida_extra":
      return narrarCombate(e, s);
    case "baixa":
      return {
        texto: preencher(s.frase(BAIXA), {
          X: nome(e.eliminado),
          J: jogador(e.time ?? 0),
        }),
        fora: nome(e.eliminado),
      };
    case "esquiva":
      return {
        texto: preencher(s.frase(ESQUIVA), {
          A: nome(e.atacante),
          B: nome(e.alvo),
          hab: nomeHabilidade(e.habilidades_usadas[0] ?? ""),
        }),
      };
    case "ultima_resistencia":
      return {
        texto: preencher(s.frase(ULTIMA_RESISTENCIA), {
          X: nome(e.atacante),
          J: jogador(e.time ?? 0),
        }),
      };
    case "arena_fecha":
      return { texto: s.frase(ARENA_FECHA) };
    case "condicao_final": {
      if (!e.zona || e.zona === "neutra") return null;
      const texto = s.frase(CONDICAO[e.zona]);
      return {
        texto: e.time
          ? `${texto} ${preencher(ESCOLHA_TERRENO, { J: jogador(e.time) })}`
          : texto,
      };
    }
    case "vencedor":
      return e.time
        ? { texto: preencher(s.frase(VENCEDOR), { J: jogador(e.time) }) }
        : null;
  }
  return null;
}

// Eventos que tiram alguém da batalha (fecham com "FORA!").
export function saiDaBatalha(e: Evento) {
  return e.tipo === "duelo" || e.tipo === "baixa";
}

// A narração de um round em blocos: abertura, um bloco por evento e o fechamento.
// O último round termina com o anúncio do vencedor em vez do suspense.
export function narrarRound(
  eventos: Evento[],
  round: Round,
  jogador: (time: number) => string,
): Bloco[] {
  const s = criarSorteador(eventos, round);
  const doRound = eventos.filter((e) => e.round === round);
  const abertura =
    round === "final"
      ? s.frase(ABERTURA_FINAL)
      : preencher(s.frase(ABERTURA), { n: String(round) });
  const blocos: Bloco[] = [{ texto: abertura }];

  if (!doRound.some((e) => e.tipo !== "vencedor"))
    blocos.push({ texto: s.frase(SEM_ATAQUE) });

  for (const e of doRound) {
    const bloco = narrarEvento(e, s, jogador);
    if (bloco) blocos.push(bloco);
  }

  if (!doRound.some((e) => e.tipo === "vencedor"))
    blocos.push({ texto: s.frase(FECHAMENTO) });
  return blocos;
}
