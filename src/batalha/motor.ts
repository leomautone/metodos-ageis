import {
  buscarPersonagem,
  type Habitat,
  type Personagem,
} from "@/data/personagens";

// Motor de batalha (Modelo de Batalha v7), sem dependência de tela.
// Recebe os times e um gerador aleatório; devolve a lista de eventos.

export type Zona = Habitat | "neutra";
export type Round = number | "final";
export type TipoEvento =
  | "duelo"
  // Venceu o duelo, mas o último animal do outro time gastou a vida extra.
  | "vida_extra"
  // Maldição da roleta: um animal cai antes da primeira luta.
  | "baixa"
  | "esquiva"
  | "ultima_resistencia"
  | "arena_fecha"
  | "condicao_final"
  | "vencedor";

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
  // Jogador dono do time em "vencedor", "ultima_resistencia", "baixa" e
  // "vida_extra"; em "condicao_final", quem escolheu o terreno na roleta.
  time?: number | null;
  // Em "vida_extra": o animal que perdeu o duelo e continua vivo.
  salvo?: string | null;
};

export type TimeBatalha = {
  jogadorId: number;
  codigos: string[];
  // Bênçãos e maldições da roleta (src/partida/sorte.ts):
  // soma ao Poder de todos os animais do time;
  bonus?: number;
  // soma ao Poder de um animal só (código → valor);
  ajustes?: Record<string, number>;
  // vidas extras do último animal vivo;
  vidasExtras?: number;
  // animais que caem antes da primeira luta;
  baixas?: number;
  // terrenos escolhidos para o duelo final.
  terrenos?: Habitat[];
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
  // Bênçãos e maldições do time (roleta da sorte).
  bonus: number;
};

export type Contexto = {
  round: Round;
  final: boolean;
  // Habitat sorteado no duelo final.
  condicao: Habitat | null;
};

export function criarLutador(codigo: string, time: number, bonus = 0): Lutador {
  const p = buscarPersonagem(codigo);
  if (!p) throw new Error(`Personagem ${codigo} não existe`);
  return {
    codigo,
    time,
    p,
    vivo: true,
    atacou: false,
    esquivou: false,
    veneno: 0,
    resistencia: false,
    bonus,
  };
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
  return l.p.habilidade?.efeito.tipo === "alcancaVoadores";
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
  if (ctx.final) return ["neutra"];
  const comuns = a.p.habitats.filter((h) => b.p.habitats.includes(h));
  if (comuns.length > 0) return comuns;
  return b.p.habitats.filter(
    (h) =>
      (h === "terra" && a.p.habitats.includes("ar")) ||
      (h === "ar" && temAlcancaVoadores(a)),
  );
}

// Poder efetivo = Poder + zona + habilidades + última resistência + condição final
// + bênçãos/maldições − veneno.
export function poderEfetivo(
  l: Lutador,
  oponente: Lutador,
  zona: Zona,
  papel: "atacante" | "alvo",
  ctx: Contexto,
  todos: Lutador[],
) {
  let poder = l.p.poder;
  const usadas: string[] = [];

  if (zona !== "neutra") poder += l.p.habitats.includes(zona) ? 1 : -2;

  const ultimo = sozinhoNoTime(l, todos);
  if (ultimo) poder += 1;

  if (ctx.final && ctx.condicao && l.p.habitats.includes(ctx.condicao)) {
    poder += BONUS_CONDICAO[ctx.condicao];
  }

  poder -= l.veneno;
  poder += l.bonus;

  const habilidade = l.p.habilidade;
  if (habilidade) {
    const efeito = habilidade.efeito;
    let bonus = 0;
    switch (efeito.tipo) {
      case "primeiroAtaque":
        if (papel === "atacante" && !l.atacou) bonus = efeito.valor;
        break;
      case "quandoAtacado":
        if (papel === "alvo") bonus = efeito.valor;
        break;
      case "contraHabitat":
        if (oponente.p.habitats.includes(efeito.habitat)) bonus = efeito.valor;
        break;
      case "contraPersonagens":
        if (efeito.codigos.includes(oponente.codigo)) bonus = efeito.valor;
        break;
      case "extraNaAgua":
        if (zona === "agua") bonus = efeito.valor;
        break;
      case "ultimoDoTime":
        if (ultimo) bonus = efeito.valor;
        break;
      case "aPartirDoRound3":
        if (ctx.final || (typeof ctx.round === "number" && ctx.round >= 3))
          bonus = efeito.valor;
        break;
      case "duelofinal":
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
export function melhorAtaque(
  a: Lutador,
  todos: Lutador[],
  ctx: Contexto,
): Ataque | null {
  let melhor: Ataque | null = null;
  for (const b of todos) {
    if (!b.vivo || b.time === a.time || !alcanca(a, b, ctx)) continue;
    for (const zona of zonasDoDuelo(a, b, ctx)) {
      const pa = poderEfetivo(a, b, zona, "atacante", ctx, todos);
      const pb = poderEfetivo(b, a, zona, "alvo", ctx, todos);
      const chance = chanceDeVitoria(pa.poder, pb.poder);
      if (!melhor || chance > melhor.chance) {
        melhor = {
          alvo: b,
          zona,
          chance,
          poderA: pa.poder,
          poderB: pb.poder,
          usadas: [...pa.usadas, ...pb.usadas],
        };
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

function evento(
  round: Round,
  tipo: TipoEvento,
  extra: Partial<Evento> = {},
): Evento {
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

export function simularBatalha(
  times: TimeBatalha[],
  aleatorio: Aleatorio,
): ResultadoBatalha {
  const todos = times.flatMap((t) =>
    t.codigos.map((c) =>
      criarLutador(c, t.jogadorId, (t.bonus ?? 0) + (t.ajustes?.[c] ?? 0)),
    ),
  );
  const vidas: Record<number, number> = {};
  for (const t of times) vidas[t.jogadorId] = t.vidasExtras ?? 0;
  const eventos: Evento[] = [];
  const eliminacao: Record<number, Round> = {};
  const ctx: Contexto = { round: 1, final: false, condicao: null };

  for (const t of times)
    if (t.codigos.length === 0) eliminacao[t.jogadorId] = 0;

  const vivos = () => todos.filter((l) => l.vivo);
  const timesVivos = () => [...new Set(vivos().map((l) => l.time))];
  const dado = () => 1 + Math.floor(aleatorio() * 10);

  function anunciarResistencia(time: number) {
    const restantes = todos.filter((l) => l.vivo && l.time === time);
    const ultimo = restantes[0];
    if (restantes.length !== 1 || ultimo.resistencia) return;
    ultimo.resistencia = true;
    eventos.push(
      evento(ctx.round, "ultima_resistencia", {
        atacante: ultimo.codigo,
        time,
      }),
    );
  }

  function atacar(a: Lutador, ataque: Ataque) {
    const b = ataque.alvo;
    const habB = b.p.habilidade;

    // Esquiva: o 1º ataque recebido falha; para o atacante conta como o 1º ataque dele.
    if (habB?.efeito.tipo === "esquivaPrimeiroAtaque" && !b.esquivou) {
      b.esquivou = true;
      a.atacou = true;
      eventos.push(
        evento(ctx.round, "esquiva", {
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
    const poderVencedor = atacanteVence ? ataque.poderA : ataque.poderB;
    const poderPerdedor = atacanteVence ? ataque.poderB : ataque.poderA;

    // Vida extra: o último animal do time perde o duelo, mas continua de pé.
    if (vidas[perdedor.time] > 0 && sozinhoNoTime(perdedor, todos)) {
      vidas[perdedor.time] -= 1;
      eventos.push(
        evento(ctx.round, "vida_extra", {
          zona: ataque.zona,
          atacante: a.codigo,
          alvo: b.codigo,
          poder: [ataque.poderA, ataque.poderB],
          habilidades_usadas: [...new Set(ataque.usadas)],
          zebra: poderVencedor < poderPerdedor,
          time: perdedor.time,
          salvo: perdedor.codigo,
        }),
      );
      return;
    }
    perdedor.vivo = false;

    const usadas = [...ataque.usadas];
    // Veneno: quem sobreviver a um duelo com o venenoso perde Poder até o fim.
    const habP = perdedor.p.habilidade;
    if (habP?.efeito.tipo === "veneno") {
      vencedor.veneno += habP.efeito.valor;
      usadas.push(habP.texto);
    }

    eventos.push(
      evento(ctx.round, "duelo", {
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

  // Maldição "Baixa Antes da Luta": um animal sorteado cai antes de tudo
  // (nunca o último do time).
  for (const t of times) {
    for (let i = 0; i < (t.baixas ?? 0); i++) {
      const doTime = todos.filter((l) => l.vivo && l.time === t.jogadorId);
      if (doTime.length <= 1) break;
      const caido = doTime[Math.floor(aleatorio() * doTime.length)];
      caido.vivo = false;
      eventos.push(
        evento(1, "baixa", { eliminado: caido.codigo, time: t.jogadorId }),
      );
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
    ctx.round = "final";
    ctx.final = true;
    eventos.push(evento("final", "arena_fecha", { zona: "neutra" }));

    // Senhor da Arena: vale a escolha de quem ainda está vivo (se houver mais
    // de uma, sorteia entre elas). Sem escolha, sorteia entre os habitats vivos.
    const escolhas = times
      .filter((t) => timesVivos().includes(t.jogadorId))
      .flatMap((t) =>
        (t.terrenos ?? []).map((terreno) => ({ terreno, time: t.jogadorId })),
      );
    if (escolhas.length > 0) {
      const escolha = escolhas[Math.floor(aleatorio() * escolhas.length)];
      ctx.condicao = escolha.terreno;
      eventos.push(
        evento("final", "condicao_final", {
          zona: ctx.condicao,
          time: escolha.time,
        }),
      );
    } else {
      const habitats = [...new Set(vivos().flatMap((l) => l.p.habitats))];
      ctx.condicao = habitats[Math.floor(aleatorio() * habitats.length)];
      eventos.push(evento("final", "condicao_final", { zona: ctx.condicao }));
    }

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
  eventos.push(evento(ctx.round, "vencedor", { time: vencedor }));

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
export function calcularChances(
  times: TimeBatalha[],
  simulacoes = SIMULACOES,
  semente = 2026,
) {
  const aleatorio = criarAleatorio(semente);
  const vitorias: Record<number, number> = {};
  for (const t of times) vitorias[t.jogadorId] = 0;
  for (let i = 0; i < simulacoes; i++) {
    const { vencedor } = simularBatalha(times, aleatorio);
    if (vencedor !== null) vitorias[vencedor] += 1;
  }
  const chances: Record<number, number> = {};
  for (const t of times)
    chances[t.jogadorId] = vitorias[t.jogadorId] / simulacoes;
  return chances;
}
