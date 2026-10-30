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

// Lance mínimo R$ 0; depois, incremento mínimo de R$ 1.
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

// Decide como o personagem da vez sai do leilão, sem mexer em saldo nem time.
// Sem lance com repescagem livre, ele já vai direto para a repescagem.
export function encerrarPersonagem(partida: Partida, lance: Lance | null) {
  const codigo = partida.fila[partida.indiceAtual];
  let venda: Venda;

  if (lance) {
    venda = { codigo, jogadorId: lance.jogadorId, valor: lance.valor, tipo: 'lance' };
  } else if (partida.repescagem.length < MAX_REPESCAGEM) {
    venda = { codigo, jogadorId: null, valor: 0, tipo: 'repescagem' };
  } else {
    const { jogadorId, dados } = escolherObrigatorio(partida.jogadores);
    const saldo = partida.jogadores.find((j) => j.id === jogadorId)!.saldo;
    // Custa R$ 1,00, grátis se o saldo for zero.
    const valor = saldo > 0 ? CUSTO_OBRIGATORIO : 0;
    venda = { codigo, jogadorId, valor, tipo: 'obrigatorio', dados };
  }

  // Quem ganhou um personagem ainda precisa registrar a carta (QR) antes de seguir.
  if (venda.jogadorId !== null) {
    return { partida: { ...partida, pendente: venda }, venda };
  }
  return { partida: aplicarVenda(partida, venda), venda };
}

// Registra a venda: desconta o valor, põe no time e passa para o próximo personagem.
export function aplicarVenda(partida: Partida, venda: Venda): Partida {
  const jogadores = partida.jogadores.map((j) =>
    j.id === venda.jogadorId
      ? { ...j, saldo: j.saldo - venda.valor, time: [...j.time, venda.codigo] }
      : j,
  );
  return {
    ...partida,
    jogadores,
    repescagem: venda.jogadorId === null ? [...partida.repescagem, venda.codigo] : partida.repescagem,
    indiceAtual: partida.indiceAtual + 1,
    vendas: [...partida.vendas, venda],
    pendente: null,
  };
}

export function leilaoConcluido(partida: Partida) {
  return partida.indiceAtual >= partida.fila.length;
}
