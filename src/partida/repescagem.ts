import { desempatarMenorDado, rolarDado, vagas, type Aleatorio } from '@/partida/leilao';
import type { Jogador, Partida, Venda } from '@/partida/partida';

// Distribuição da repescagem (Regras v8), sem dependência de tela.

export const CUSTO_REPESCAGEM = 1;

// R$ 1 por personagem, grátis com saldo zero.
export function custoRepescagem(jogador: Jogador) {
  return jogador.saldo > 0 ? CUSTO_REPESCAGEM : 0;
}

// Quem empatou no dinheiro joga o dado e o MAIOR vem primeiro (repete se empatar de novo).
function ordenarEmpate(ids: number[], dados: Record<number, number[]>, aleatorio: Aleatorio): number[] {
  if (ids.length <= 1) return ids;
  const rodada = ids.map((id) => {
    const valor = rolarDado(aleatorio);
    (dados[id] ??= []).push(valor);
    return { id, valor };
  });
  const valores = [...new Set(rodada.map((r) => r.valor))].sort((a, b) => b - a);
  return valores.flatMap((v) =>
    ordenarEmpate(
      rodada.filter((r) => r.valor === v).map((r) => r.id),
      dados,
      aleatorio,
    ),
  );
}

// Monta a ordem: só quem tem vaga, de quem tem mais dinheiro para quem tem menos.
export function iniciarRepescagem(partida: Partida, aleatorio: Aleatorio = Math.random): Partida {
  const candidatos = partida.jogadores.filter((j) => vagas(j) > 0);
  const saldos = [...new Set(candidatos.map((j) => j.saldo))].sort((a, b) => b - a);
  const dados: Record<number, number[]> = {};
  const ordem = saldos.flatMap((saldo) =>
    ordenarEmpate(
      candidatos.filter((j) => j.saldo === saldo).map((j) => j.id),
      dados,
      aleatorio,
    ),
  );
  return {
    ...partida,
    distribuicao: { ordem, vez: 0, passes: 0, dados: Object.keys(dados).length > 0 ? dados : null },
  };
}

// Posição na ordem do próximo jogador que ainda tem vaga, a partir da vez atual.
function posicaoDaVez(partida: Partida) {
  const d = partida.distribuicao;
  if (!d) return null;
  for (let i = 0; i < d.ordem.length; i++) {
    const posicao = (d.vez + i) % d.ordem.length;
    const jogador = partida.jogadores.find((j) => j.id === d.ordem[posicao]);
    if (jogador && vagas(jogador) > 0) return { posicao, jogador };
  }
  return null;
}

export function jogadorDaVez(partida: Partida) {
  return posicaoDaVez(partida)?.jogador ?? null;
}

// O jogador da vez escolhe um personagem; a carta ainda precisa ser registrada (QR).
export function escolherPersonagem(partida: Partida, codigo: string): Partida {
  const jogador = jogadorDaVez(partida);
  if (!jogador || !partida.repescagem.includes(codigo)) return partida;
  const venda: Venda = {
    codigo,
    jogadorId: jogador.id,
    valor: custoRepescagem(jogador),
    tipo: 'escolhaRepescagem',
  };
  return { ...partida, pendente: venda };
}

// O jogador da vez não quer nenhum. Se todos passaram, o próximo personagem
// fica com quem tem menos dinheiro; empate no dado, o menor fica com ele.
export function passarVez(partida: Partida, aleatorio: Aleatorio = Math.random): Partida {
  const d = partida.distribuicao;
  const vez = posicaoDaVez(partida);
  if (!d || !vez) return partida;

  const comVaga = partida.jogadores.filter((j) => vagas(j) > 0);
  const passes = d.passes + 1;
  if (passes < comVaga.length) {
    return { ...partida, distribuicao: { ...d, vez: vez.posicao + 1, passes } };
  }

  const menorSaldo = Math.min(...comVaga.map((j) => j.saldo));
  const { jogadorId, dados } = desempatarMenorDado(
    comVaga.filter((j) => j.saldo === menorSaldo).map((j) => j.id),
    aleatorio,
  );
  const dono = comVaga.find((j) => j.id === jogadorId)!;
  const venda: Venda = {
    codigo: partida.repescagem[0],
    jogadorId,
    valor: custoRepescagem(dono),
    tipo: 'sobraRepescagem',
    dados,
  };
  return { ...partida, pendente: venda, distribuicao: { ...d, passes: 0 } };
}
