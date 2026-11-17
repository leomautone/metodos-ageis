import type { TimeBatalha } from "@/batalha/motor";
import { buscarPersonagem, type Habitat } from "@/data/personagens";
import { buscarItemSorte, poderDoAtributo, type ItemSorte } from "@/data/sorte";
import type { Aleatorio } from "@/partida/leilao";
import type { Jogador, Partida } from "@/partida/partida";

// Regras da roleta de bênçãos e maldições, sem dependência de tela. Depois do
// draft, quem tem pelo menos R$ 5 pode (não é obrigado) girar: cada giro custa
// R$ 5, menos os giros de graça ganhos na própria roleta.

export const CUSTO_GIRO = 5;

// Troca do Destino: o jogador deu `dei` para o jogador `com` e recebeu `recebi`.
export type Troca = { com: number; dei: string; recebi: string };

export type GiroSorte = {
  item: string;
  // Foi um giro de graça (de "Giros Extras")?
  gratis: boolean;
  // Senhor da Arena: o terreno escolhido (fica vazio até o jogador escolher).
  terreno?: Habitat;
  // Troca do Destino: o que foi trocado (null = não havia com quem trocar).
  troca?: Troca | null;
};

export function girosDoJogador(
  partida: Partida,
  jogadorId: number,
): GiroSorte[] {
  return partida.sorte[jogadorId] ?? [];
}

export function girosGratis(partida: Partida, jogadorId: number) {
  const giros = girosDoJogador(partida, jogadorId);
  const ganhos = giros.reduce((s, g) => {
    const efeito = buscarItemSorte(g.item)?.efeito;
    return efeito?.tipo === "girosExtras" ? s + efeito.giros : s;
  }, 0);
  return ganhos - giros.filter((g) => g.gratis).length;
}

export function girosDisponiveis(partida: Partida, jogador: Jogador) {
  return (
    Math.floor(jogador.saldo / CUSTO_GIRO) + girosGratis(partida, jogador.id)
  );
}

export function podeGirar(partida: Partida) {
  return (
    !partida.batalha &&
    partida.jogadores.some((j) => girosDisponiveis(partida, j) > 0)
  );
}

function sortear<T>(lista: T[], aleatorio: Aleatorio) {
  return lista[Math.floor(aleatorio() * lista.length)];
}

// Registra o resultado de um giro: desconta R$ 5 (ou usa um giro de graça),
// guarda o item e já faz a troca, se for a Troca do Destino.
export function aplicarGiro(
  partida: Partida,
  jogadorId: number,
  itemId: string,
  aleatorio: Aleatorio = Math.random,
): Partida {
  const jogador = partida.jogadores.find((j) => j.id === jogadorId);
  const item = buscarItemSorte(itemId);
  if (!jogador || !item || girosDisponiveis(partida, jogador) === 0)
    return partida;

  const gratis = girosGratis(partida, jogadorId) > 0;
  const giro: GiroSorte = { item: itemId, gratis };
  let jogadores = partida.jogadores.map((j) =>
    j.id === jogadorId && !gratis ? { ...j, saldo: j.saldo - CUSTO_GIRO } : j,
  );

  if (item.efeito.tipo === "troca") {
    const outros = jogadores.filter(
      (j) => j.id !== jogadorId && j.time.length > 0,
    );
    if (jogador.time.length > 0 && outros.length > 0) {
      const outro = sortear(outros, aleatorio);
      const dei = sortear(jogador.time, aleatorio);
      const recebi = sortear(outro.time, aleatorio);
      giro.troca = { com: outro.id, dei, recebi };
      jogadores = jogadores.map((j) => {
        if (j.id === jogadorId)
          return { ...j, time: j.time.map((c) => (c === dei ? recebi : c)) };
        if (j.id === outro.id)
          return { ...j, time: j.time.map((c) => (c === recebi ? dei : c)) };
        return j;
      });
    } else {
      giro.troca = null;
    }
  }

  return {
    ...partida,
    jogadores,
    sorte: {
      ...partida.sorte,
      [jogadorId]: [...girosDoJogador(partida, jogadorId), giro],
    },
  };
}

// Senhor da Arena: o jogador escolhe o terreno do giro `indice`.
export function escolherTerreno(
  partida: Partida,
  jogadorId: number,
  indice: number,
  terreno: Habitat,
): Partida {
  const giros = girosDoJogador(partida, jogadorId);
  if (
    buscarItemSorte(giros[indice]?.item ?? "")?.efeito.tipo !== "escolheTerreno"
  )
    return partida;
  return {
    ...partida,
    sorte: {
      ...partida.sorte,
      [jogadorId]: giros.map((g, i) => (i === indice ? { ...g, terreno } : g)),
    },
  };
}

// Algum Senhor da Arena ainda sem terreno escolhido? (índice do giro ou -1)
export function terrenoPendente(partida: Partida, jogadorId: number) {
  return girosDoJogador(partida, jogadorId).findIndex(
    (g) =>
      buscarItemSorte(g.item)?.efeito.tipo === "escolheTerreno" && !g.terreno,
  );
}

export function itensDoJogador(
  partida: Partida,
  jogadorId: number,
): ItemSorte[] {
  return girosDoJogador(partida, jogadorId)
    .map((g) => buscarItemSorte(g.item))
    .filter((i): i is ItemSorte => !!i);
}

// Texto curto de cada item ganho, para a IA citar como "sinais do destino".
export function sorteParaNarracao(partida: Partida, jogadorId: number) {
  const rotulo = { bencao: "Bênção", maldicao: "Maldição", neutro: "Destino" };
  return itensDoJogador(partida, jogadorId).map(
    (i) => `${rotulo[i.tipo]}: ${i.nome} (${i.descricao})`,
  );
}

// O time do jogador como entra na batalha, já com as bênçãos e maldições.
export function timeDaBatalha(partida: Partida, jogador: Jogador): TimeBatalha {
  let bonus = 0;
  const ajustes: Record<string, number> = {};
  let vidasExtras = 0;
  let baixas = 0;
  const terrenos: Habitat[] = [];
  const poder = (c: string) =>
    (buscarPersonagem(c)?.poder ?? 0) + (ajustes[c] ?? 0);

  for (const giro of girosDoJogador(partida, jogador.id)) {
    const efeito = buscarItemSorte(giro.item)?.efeito;
    if (!efeito) continue;
    switch (efeito.tipo) {
      case "poderTime":
        bonus += efeito.valor;
        break;
      case "atributoTime":
        bonus += poderDoAtributo(efeito.atributo, efeito.valor);
        break;
      case "poderMaisFraco":
      case "poderMaisForte": {
        if (jogador.time.length === 0) break;
        const fraco = efeito.tipo === "poderMaisFraco";
        const alvo = jogador.time.reduce((a, b) =>
          (fraco ? poder(b) < poder(a) : poder(b) > poder(a)) ? b : a,
        );
        ajustes[alvo] = (ajustes[alvo] ?? 0) + efeito.valor;
        break;
      }
      case "vidaExtra":
        vidasExtras += 1;
        break;
      case "perdePersonagem":
        baixas += 1;
        break;
      case "escolheTerreno":
        if (giro.terreno) terrenos.push(giro.terreno);
        break;
    }
  }

  return {
    jogadorId: jogador.id,
    codigos: jogador.time,
    bonus,
    ajustes,
    vidasExtras,
    baixas,
    terrenos,
  };
}
