import { buscarPersonagem, type Habitat, type Personagem } from '@/data/personagens';

// Motor de batalha (Modelo de Batalha v7), sem dependência de tela.
// Recebe os times e um gerador aleatório; devolve a lista de eventos.

export type Zona = Habitat | 'neutra';
export type Round = number | 'final';
export type TipoEvento =
  | 'duelo'
  | 'esquiva'
  | 'ultima_resistencia'
  | 'arena_fecha'
  | 'condicao_final'
  | 'vencedor';

export type Evento = {
  round: Round;
  tipo: TipoEvento;
  zona: Zona | null;
  atacante: string | null;
  alvo: string | null;
  // Poder efetivo de atacante e alvo no duelo.
  poder: [number, number] | null;
  eliminado: string | null;
  habilidades_usadas: string[];
  zebra: boolean;
  // Só no evento "vencedor" e na "ultima_resistencia": o jogador dono do time.
  time?: number | null;
};

export type TimeBatalha = {
  jogadorId: number;
  codigos: string[];
};

export type ResultadoBatalha = {
  eventos: Evento[];
  vencedor: number | null;
  // Personagens do time vencedor que ficaram de pé.
  sobreviventes: string[];
  // Round em que cada time perdeu o último personagem (0 = já entrou sem ninguém).
  eliminacao: Record<number, Round>;
};

export const MAX_ROUNDS = 5;
export const CHANCE_MINIMA = 0.4;
export const SIMULACOES = 2000;
const BONUS_CONDICAO: Record<Habitat, number> = { terra: 2, agua: 2, ar: 1.5 };
const EPSILON = 1e-9;

export type Aleatorio = () => number;

// Gerador com semente (mulberry32): a mesma semente repete a mesma batalha.
export function criarAleatorio(semente: number): Aleatorio {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Lutador = {
  codigo: string;
  time: number;
  p: Personagem;
  vivo: boolean;
  // Já fez o 1º ataque da partida (inclui ataque que caiu numa esquiva).
  atacou: boolean;
  // Já usou a esquiva do 1º ataque recebido.
  esquivou: boolean;
  // Veneno acumulado, descontado do Poder até o fim.
  veneno: number;
  // Já foi anunciada a última resistência.
  resistencia: boolean;
};

export type Contexto = {
  round: Round;
  final: boolean;
  // Habitat sorteado no duelo final.
  condicao: Habitat | null;
};

export function criarLutador(codigo: string, time: number): Lutador {
  const p = buscarPersonagem(codigo);
  if (!p) throw new Error(`Personagem ${codigo} não existe`);
  return { codigo, time, p, vivo: true, atacou: false, esquivou: false, veneno: 0, resistencia: false };
}

// Probabilidade exata de A vencer: Força = 0,8 × Poder + 0,2 × dado (1 a 10).
// A diferença dos dados k = dA − dB vai de −9 a 9 e acontece de (10 − |k|) jeitos em 100.
// Empate exato rola de novo, então ele sai da conta.
export function chanceDeVitoria(poderA: number, poderB: number) {
  const base = 0.8 * (poderA - poderB);
  let vence = 0;
  let perde = 0;
  for (let k = -9; k <= 9; k++) {
    const jeitos = 10 - Math.abs(k);
    const forca = base + 0.2 * k;
    if (forca > EPSILON) vence += jeitos;
    else if (forca < -EPSILON) perde += jeitos;
  }
  return vence / (vence + perde);
}

function temAlcancaVoadores(l: Lutador) {
  return l.p.habilidade?.efeito.tipo === 'alcancaVoadores';
}

function sozinhoNoTime(l: Lutador, todos: Lutador[]) {
  return todos.filter((o) => o.vivo && o.time === l.time).length === 1;
}

// Habitat em comum sempre se alcança; quem voa alcança quem tem terra;
// quem tem "alcancaVoadores" alcança quem voa. No duelo final todos se alcançam.
export function alcanca(a: Lutador, b: Lutador, ctx: Contexto) {
  if (ctx.final) return true;
  return zonasDoDuelo(a, b, ctx).length > 0;
}

// Zonas possíveis do duelo: o habitat em comum ou, sem ele, o habitat de quem é atacado.
export function zonasDoDuelo(a: Lutador, b: Lutador, ctx: Contexto): Zona[] {
  if (ctx.final) return ['neutra'];
  const comuns = a.p.habitats.filter((h) => b.p.habitats.includes(h));
  if (comuns.length > 0) return comuns;
  return b.p.habitats.filter(
    (h) => (h === 'terra' && a.p.habitats.includes('ar')) || (h === 'ar' && temAlcancaVoadores(a)),
  );
}

// Poder efetivo = Poder + zona + habilidades + última resistência + condição final − veneno.
export function poderEfetivo(
  l: Lutador,
  oponente: Lutador,
  zona: Zona,
  papel: 'atacante' | 'alvo',
  ctx: Contexto,
  todos: Lutador[],
) {
  let poder = l.p.poder;
  const usadas: string[] = [];

  if (zona !== 'neutra') poder += l.p.habitats.includes(zona) ? 1 : -2;

  const ultimo = sozinhoNoTime(l, todos);
  if (ultimo) poder += 1;

  if (ctx.final && ctx.condicao && l.p.habitats.includes(ctx.condicao)) {
    poder += BONUS_CONDICAO[ctx.condicao];
  }

  poder -= l.veneno;

  const habilidade = l.p.habilidade;
  if (habilidade) {
    const efeito = habilidade.efeito;
    let bonus = 0;
    switch (efeito.tipo) {
      case 'primeiroAtaque':
        if (papel === 'atacante' && !l.atacou) bonus = efeito.valor;
        break;
      case 'quandoAtacado':
        if (papel === 'alvo') bonus = efeito.valor;
        break;
      case 'contraHabitat':
        if (oponente.p.habitats.includes(efeito.habitat)) bonus = efeito.valor;
        break;
      case 'contraPersonagens':
        if (efeito.codigos.includes(oponente.codigo)) bonus = efeito.valor;
        break;
      case 'extraNaAgua':
        if (zona === 'agua') bonus = efeito.valor;
        break;
      case 'ultimoDoTime':
        if (ultimo) bonus = efeito.valor;
        break;
      case 'aPartirDoRound3':
        if (ctx.final || (typeof ctx.round === 'number' && ctx.round >= 3)) bonus = efeito.valor;
        break;
      case 'duelofinal':
        if (ctx.final) bonus = efeito.valor;
        break;
    }
    if (bonus) {
      poder += bonus;
      usadas.push(habilidade.texto);
    }
  }

  return { poder, usadas };
}

type Ataque = {
  alvo: Lutador;
  zona: Zona;
  chance: number;
  poderA: number;
  poderB: number;
  usadas: string[];
};

// O alvo alcançável com MAIOR chance de vitória (e a melhor zona para o atacante).
export function melhorAtaque(a: Lutador, todos: Lutador[], ctx: Contexto): Ataque | null {
  let melhor: Ataque | null = null;
  for (const b of todos) {
    if (!b.vivo || b.time === a.time || !alcanca(a, b, ctx)) continue;
    for (const zona of zonasDoDuelo(a, b, ctx)) {
      const pa = poderEfetivo(a, b, zona, 'atacante', ctx, todos);
      const pb = poderEfetivo(b, a, zona, 'alvo', ctx, todos);
      const chance = chanceDeVitoria(pa.poder, pb.poder);
      if (!melhor || chance > melhor.chance) {
        melhor = { alvo: b, zona, chance, poderA: pa.poder, poderB: pb.poder, usadas: [...pa.usadas, ...pb.usadas] };
      }
    }
  }
  return melhor;
}

function embaralhar<T>(lista: T[], aleatorio: Aleatorio) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function evento(round: Round, tipo: TipoEvento, extra: Partial<Evento> = {}): Evento {
  return {
    round,
    tipo,
    zona: null,
    atacante: null,
    alvo: null,
    poder: null,
    eliminado: null,
    habilidades_usadas: [],
    zebra: false,
    ...extra,
  };
}

export function simularBatalha(times: TimeBatalha[], aleatorio: Aleatorio): ResultadoBatalha {
  const todos = times.flatMap((t) => t.codigos.map((c) => criarLutador(c, t.jogadorId)));
  const eventos: Evento[] = [];
  const eliminacao: Record<number, Round> = {};
  const ctx: Contexto = { round: 1, final: false, condicao: null };

  for (const t of times) if (t.codigos.length === 0) eliminacao[t.jogadorId] = 0;

  const vivos = () => todos.filter((l) => l.vivo);
  const timesVivos = () => [...new Set(vivos().map((l) => l.time))];
  const dado = () => 1 + Math.floor(aleatorio() * 10);

  function anunciarResistencia(time: number) {
    const restantes = todos.filter((l) => l.vivo && l.time === time);
    const ultimo = restantes[0];
    if (restantes.length !== 1 || ultimo.resistencia) return;
    ultimo.resistencia = true;
    eventos.push(evento(ctx.round, 'ultima_resistencia', { atacante: ultimo.codigo, time }));
  }

  function atacar(a: Lutador, ataque: Ataque) {
    const b = ataque.alvo;
    const habB = b.p.habilidade;

    // Esquiva: o 1º ataque recebido falha; para o atacante conta como o 1º ataque dele.
    if (habB?.efeito.tipo === 'esquivaPrimeiroAtaque' && !b.esquivou) {
      b.esquivou = true;
      a.atacou = true;
      eventos.push(
        evento(ctx.round, 'esquiva', {
          zona: ataque.zona,
          atacante: a.codigo,
          alvo: b.codigo,
          habilidades_usadas: [habB.texto],
        }),
      );
      return;
    }

    let forcaA: number;
    let forcaB: number;
    do {
      forcaA = 0.8 * ataque.poderA + 0.2 * dado();
      forcaB = 0.8 * ataque.poderB + 0.2 * dado();
    } while (Math.abs(forcaA - forcaB) < EPSILON);

    a.atacou = true;
    const atacanteVence = forcaA > forcaB;
    const vencedor = atacanteVence ? a : b;
    const perdedor = atacanteVence ? b : a;
    perdedor.vivo = false;

    const usadas = [...ataque.usadas];
    // Veneno: quem sobreviver a um duelo com o venenoso perde Poder até o fim.
    const habP = perdedor.p.habilidade;
    if (habP?.efeito.tipo === 'veneno') {
      vencedor.veneno += habP.efeito.valor;
      usadas.push(habP.texto);
    }

    const poderVencedor = atacanteVence ? ataque.poderA : ataque.poderB;
    const poderPerdedor = atacanteVence ? ataque.poderB : ataque.poderA;
    eventos.push(
      evento(ctx.round, 'duelo', {
        zona: ataque.zona,
        atacante: a.codigo,
        alvo: b.codigo,
        poder: [ataque.poderA, ataque.poderB],
        eliminado: perdedor.codigo,
        habilidades_usadas: [...new Set(usadas)],
        zebra: poderVencedor < poderPerdedor,
      }),
    );

    if (!todos.some((l) => l.vivo && l.time === perdedor.time)) {
      eliminacao[perdedor.time] = ctx.round;
    } else {
      anunciarResistencia(perdedor.time);
    }
  }

  // Times que já começam com um personagem só entram em última resistência.
  for (const t of timesVivos()) anunciarResistencia(t);

  // Rounds normais.
  for (let round = 1; round <= MAX_ROUNDS && timesVivos().length > 1; round++) {
    ctx.round = round;
    const algumAtaca = vivos().some((a) => {
      const ataque = melhorAtaque(a, todos, ctx);
      return ataque !== null && ataque.chance >= CHANCE_MINIMA;
    });
    if (!algumAtaca) break;

    for (const a of embaralhar(vivos(), aleatorio)) {
      if (!a.vivo || timesVivos().length <= 1) continue;
      const ataque = melhorAtaque(a, todos, ctx);
      if (ataque && ataque.chance >= CHANCE_MINIMA) atacar(a, ataque);
    }
  }

  // Duelo final: zona neutra, todos se alcançam e todos atacam.
  if (timesVivos().length > 1) {
    ctx.round = 'final';
    ctx.final = true;
    eventos.push(evento('final', 'arena_fecha', { zona: 'neutra' }));

    const habitats = [...new Set(vivos().flatMap((l) => l.p.habitats))];
    ctx.condicao = habitats[Math.floor(aleatorio() * habitats.length)];
    eventos.push(evento('final', 'condicao_final', { zona: ctx.condicao }));

    for (let volta = 0; volta < 100 && timesVivos().length > 1; volta++) {
      for (const a of embaralhar(vivos(), aleatorio)) {
        if (!a.vivo || timesVivos().length <= 1) continue;
        const ataque = melhorAtaque(a, todos, ctx);
        if (ataque) atacar(a, ataque);
      }
    }
  }

  const restantes = timesVivos();
  const vencedor = restantes.length === 1 ? restantes[0] : null;
  eventos.push(evento(ctx.round, 'vencedor', { time: vencedor }));

  return {
    eventos,
    vencedor,
    sobreviventes: vivos()
      .filter((l) => l.time === vencedor)
      .map((l) => l.codigo),
    eliminacao,
  };
}

// Chance de cada time antes da luta: % de vitórias em 2.000 simulações.
export function calcularChances(times: TimeBatalha[], simulacoes = SIMULACOES, semente = 2026) {
  const aleatorio = criarAleatorio(semente);
  const vitorias: Record<number, number> = {};
  for (const t of times) vitorias[t.jogadorId] = 0;
  for (let i = 0; i < simulacoes; i++) {
    const { vencedor } = simularBatalha(times, aleatorio);
    if (vencedor !== null) vitorias[vencedor] += 1;
  }
  const chances: Record<number, number> = {};
  for (const t of times) chances[t.jogadorId] = vitorias[t.jogadorId] / simulacoes;
  return chances;
}
