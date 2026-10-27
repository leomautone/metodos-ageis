import { TAMANHO_TIME, type Jogador, type Partida, type Venda } from '@/partida/partida';

// Regras do leilão (Regras v8), sem dependência de tela.

export const TEMPO_INICIAL_MS = 15_000;
export const TEMPO_APOS_LANCE_MS = 5_000;
export const MAX_REPESCAGEM = 3;
export const CUSTO_OBRIGATORIO = 1;

export type Lance = {
  jogadorId: number;
  valor: number;
};

export function vagas(jogador: Jogador) {
  return TAMANHO_TIME - jogador.time.length;
}

// Lance mínimo R$ 0,00; depois, incremento mínimo de R$ 1,00.
export function lanceMinimo(lance: Lance | null) {
  return lance ? lance.valor + 1 : 0;
}

// Ninguém dá lance maior que o próprio saldo, nem com o time completo,
// nem cobre o próprio lance.
export function podeDarLance(jogador: Jogador, valor: number, lance: Lance | null) {
  return (
    vagas(jogador) > 0 &&
    valor >= lanceMinimo(lance) &&
    valor <= jogador.saldo &&
    jogador.id !== lance?.jogadorId
  );
}

function rolarDado() {
  return Math.floor(Math.random() * 6) + 1;
}

// Repescagem cheia: vai para quem tem mais vagas no time.
// Empate: os empatados jogam o dado e o MENOR fica (repete se empatar de novo).
function escolherObrigatorio(jogadores: Jogador[]) {
  const maxVagas = Math.max(...jogadores.map(vagas));
  let candidatos = jogadores.filter((j) => vagas(j) === maxVagas).map((j) => j.id);
  if (candidatos.length === 1) return { jogadorId: candidatos[0] };

  const dados: Record<number, number[]> = {};
  while (candidatos.length > 1) {
    const rodada = candidatos.map((id) => {
      const valor = rolarDado();
      (dados[id] ??= []).push(valor);
      return { id, valor };
    });
    const menor = Math.min(...rodada.map((r) => r.valor));
    candidatos = rodada.filter((r) => r.valor === menor).map((r) => r.id);
  }
  return { jogadorId: candidatos[0], dados };
}

// Fecha o personagem da vez e devolve a partida atualizada e o que aconteceu.
export function encerrarPersonagem(partida: Partida, lance: Lance | null) {
  const codigo = partida.fila[partida.indiceAtual];
  let venda: Venda;
  let repescagem = partida.repescagem;

  if (lance) {
    venda = { codigo, jogadorId: lance.jogadorId, valor: lance.valor, tipo: 'lance' };
  } else if (repescagem.length < MAX_REPESCAGEM) {
    venda = { codigo, jogadorId: null, valor: 0, tipo: 'repescagem' };
    repescagem = [...repescagem, codigo];
  } else {
    const { jogadorId, dados } = escolherObrigatorio(partida.jogadores);
    const saldo = partida.jogadores.find((j) => j.id === jogadorId)!.saldo;
    // Custa R$ 1,00, grátis se o saldo for zero.
    const valor = saldo > 0 ? CUSTO_OBRIGATORIO : 0;
    venda = { codigo, jogadorId, valor, tipo: 'obrigatorio', dados };
  }

  const jogadores = partida.jogadores.map((j) =>
    j.id === venda.jogadorId
      ? { ...j, saldo: j.saldo - venda.valor, time: [...j.time, codigo] }
      : j,
  );

  return {
    partida: {
      ...partida,
      jogadores,
      repescagem,
      indiceAtual: partida.indiceAtual + 1,
      vendas: [...partida.vendas, venda],
    },
    venda,
  };
}

export function leilaoConcluido(partida: Partida) {
  return partida.indiceAtual >= partida.fila.length;
}
