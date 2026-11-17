import { buscarPersonagem } from "@/data/personagens";

import type { Evento, ResultadoBatalha, Round } from "./motor";
import { nome, saiDaBatalha, type Bloco } from "./narracao";

// Narração por IA: o app manda o roteiro da batalha (já calculada pelo motor)
// para o servidor, que pede ao Claude o texto. O app confere a resposta e,
// round a round, só aceita o texto se as eliminações baterem com o roteiro.
// Sem internet, sem chave ou com resposta estranha, ficam as frases prontas.

export const URL_NARRACAO =
  "https://all-in-draft-narracao.vercel.app/api/narrar";
const SENHA_APP = "all-in-draft-ap2";
export const TEMPO_LIMITE_MS = 90_000;

export type NarracaoIA = {
  // Rounds que a IA narrou e que passaram na conferência (chave = round).
  rounds: Record<string, Bloco[]>;
  modelo: string;
};

type JogadorRoteiro = {
  id: number;
  nome: string;
  time: string[];
  sorte: string[];
};

function lutador(codigo: string | null) {
  if (!codigo) return null;
  const p = buscarPersonagem(codigo);
  return { nome: p?.nome ?? codigo, habitats: p?.habitats ?? [] };
}

// Habilidades usadas no evento, com o nome do dono.
function habilidades(e: Evento) {
  return e.habilidades_usadas.map((texto) => {
    const dono = [e.atacante, e.alvo].find(
      (c) => c && buscarPersonagem(c)?.habilidade?.texto === texto,
    );
    return { dono: nome(dono ?? null), texto };
  });
}

// Quem ganhou o duelo (no "vida_extra", o perdedor é o que se salvou).
function vencedorDoCombate(e: Evento) {
  if (e.tipo === "duelo")
    return nome(e.eliminado === e.alvo ? e.atacante : e.alvo);
  if (e.tipo === "vida_extra")
    return nome(e.salvo === e.alvo ? e.atacante : e.alvo);
  return null;
}

export function rodadas(eventos: Evento[]) {
  return [...new Set(eventos.map((e) => e.round))];
}

// O roteiro que vai para a IA: só nomes e acontecimentos, sem números de poder.
export function montarRoteiro(
  resultado: ResultadoBatalha,
  jogadores: JogadorRoteiro[],
) {
  const nomeJogador = (id: number | null | undefined) =>
    jogadores.find((j) => j.id === id)?.nome ?? null;
  return {
    jogadores: jogadores.map((j) => ({
      nome: j.nome,
      time: j.time.map((c) => nome(c)),
      sorte: j.sorte,
    })),
    rounds: rodadas(resultado.eventos).map((round) => ({
      round: String(round),
      eventos: resultado.eventos
        .filter((e) => e.round === round)
        .map((e) => ({
          tipo: e.tipo,
          zona: e.zona,
          atacante: lutador(e.atacante),
          alvo: lutador(e.alvo),
          vencedor: vencedorDoCombate(e),
          eliminado: e.eliminado ? nome(e.eliminado) : null,
          salvo: e.salvo ? nome(e.salvo) : null,
          habilidades: habilidades(e),
          zebra: e.zebra,
          jogador: nomeJogador(e.time),
        })),
    })),
  };
}

type RespostaIA = {
  modelo?: string;
  rounds?: {
    round?: unknown;
    blocos?: { texto?: unknown; fora?: unknown }[];
  }[];
};

// Confere cada round: os "FORA!" da IA precisam ser exatamente as eliminações do
// roteiro, na mesma ordem. Round que não bate fica de fora (usa as frases prontas).
export function conferirNarracao(
  resposta: RespostaIA,
  eventos: Evento[],
): NarracaoIA | null {
  if (!Array.isArray(resposta.rounds)) return null;
  const aceitos: Record<string, Bloco[]> = {};
  for (const round of rodadas(eventos)) {
    const chave = String(round);
    const daIA = resposta.rounds.find((r) => String(r.round) === chave);
    if (!daIA || !Array.isArray(daIA.blocos) || daIA.blocos.length === 0)
      continue;
    const blocos: Bloco[] = [];
    let valido = true;
    for (const b of daIA.blocos) {
      if (typeof b.texto !== "string" || !b.texto.trim()) {
        valido = false;
        break;
      }
      blocos.push(
        typeof b.fora === "string" && b.fora.trim()
          ? { texto: b.texto.trim(), fora: b.fora.trim() }
          : { texto: b.texto.trim() },
      );
    }
    const esperados = eventos
      .filter((e) => e.round === round && saiDaBatalha(e))
      .map((e) => nome(e.eliminado));
    const narrados = blocos.filter((b) => b.fora).map((b) => b.fora);
    if (
      valido &&
      esperados.length === narrados.length &&
      esperados.every((n, i) => n === narrados[i])
    ) {
      aceitos[chave] = blocos;
    }
  }
  if (Object.keys(aceitos).length === 0) return null;
  return {
    rounds: aceitos,
    modelo: typeof resposta.modelo === "string" ? resposta.modelo : "IA",
  };
}

// Pede a narração ao servidor. Devolve null se falhar ou passar do tempo.
export async function pedirNarracao(
  resultado: ResultadoBatalha,
  jogadores: JogadorRoteiro[],
  cancelar?: AbortSignal,
): Promise<NarracaoIA | null> {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  cancelar?.addEventListener("abort", () => controle.abort());
  try {
    const resposta = await fetch(URL_NARRACAO, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-all-in-draft": SENHA_APP,
      },
      body: JSON.stringify(montarRoteiro(resultado, jogadores)),
      signal: controle.signal,
    });
    if (!resposta.ok) return null;
    return conferirNarracao(
      (await resposta.json()) as RespostaIA,
      resultado.eventos,
    );
  } catch {
    return null;
  } finally {
    clearTimeout(limite);
  }
}

export function blocosDoRound(
  narracao: NarracaoIA | null | undefined,
  round: Round,
) {
  return narracao?.rounds[String(round)] ?? null;
}
