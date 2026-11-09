import { buscarPersonagem } from '@/data/personagens';
import { TAMANHO_TIME, type Jogador, type Partida, type Venda } from '@/partida/partida';

// Regras do leilão, sem dependência de tela. O leilão acontece na mesa, com
// cartas e moedas de verdade: o app só marca o tempo e registra o resultado.

export const TEMPO_LEILAO_MS = 20_000;
export const MAX_REPESCAGEM = 3;
export const CUSTO_OBRIGATORIO = 1;

export function vagas(jogador: Jogador) {
  return TAMANHO_TIME - jogador.time.length;
}

// Um leilão por vaga: jogadores × 3.
export function totalLeiloes(partida: Partida) {
  return partida.jogadores.length * TAMANHO_TIME;
}

export function leilaoConcluido(partida: Partida) {
  return partida.indiceAtual >= totalLeiloes(partida);
}

// Ninguém paga mais que o próprio saldo nem compra com o time completo.
export function podeComprar(jogador: Jogador, valor: number) {
  return vagas(jogador) > 0 && Number.isInteger(valor) && valor >= 0 && valor <= jogador.saldo;
}

// A carta lida no QR (ou digitada) precisa existir e ainda não ter dono.
export function conferirCarta(partida: Partida, codigo: string): string | null {
  const p = buscarPersonagem(codigo);
  if (!p) return `"${codigo}" não é uma carta do tema Animais.`;
  const dono = partida.jogadores.find((j) => j.time.includes(codigo));
  if (dono) return `${p.nome} já está no time de ${dono.nome}.`;
  if (partida.repescagem.includes(codigo)) return `${p.nome} já está na repescagem.`;
  return null;
}

export type Aleatorio = () => number;

// A carta foi vendida na mesa para esse jogador, por esse valor.
export function venderCarta(codigo: string, jogadorId: number, valor: number): Venda {
  return { codigo, jogadorId, valor, tipo: 'lance' };
}

// Com a repescagem cheia, a carta sem lance vai obrigatoriamente para quem
// tem mais vagas no time. Todos esses são candidatos; empate vai para a roleta.
export function candidatosObrigatorio(partida: Partida) {
  const maxVagas = Math.max(...partida.jogadores.map(vagas));
  return partida.jogadores.filter((j) => vagas(j) === maxVagas).map((j) => j.id);
}

// Carta obrigatória: R$ 1, grátis com saldo zero.
export function vendaObrigatoria(partida: Partida, codigo: string, jogadorId: number): Venda {
  const saldo = partida.jogadores.find((j) => j.id === jogadorId)!.saldo;
  return { codigo, jogadorId, valor: saldo > 0 ? CUSTO_OBRIGATORIO : 0, tipo: 'obrigatorio' };
}

export type ResultadoSemLance =
  | { tipo: 'venda'; venda: Venda }
  // Empate em vagas: a tela gira a roleta entre esses jogadores.
  | { tipo: 'roleta'; candidatos: number[] };

// Ninguém deu lance: vai para a repescagem (no máximo 3). Com ela cheia, vai para
// quem tem mais vagas; se mais de um empatar, quem decide é a roleta.
export function cartaSemLance(partida: Partida, codigo: string): ResultadoSemLance {
  if (partida.repescagem.length < MAX_REPESCAGEM) {
    return { tipo: 'venda', venda: { codigo, jogadorId: null, valor: 0, tipo: 'repescagem' } };
  }
  const candidatos = candidatosObrigatorio(partida);
  if (candidatos.length > 1) return { tipo: 'roleta', candidatos };
  return { tipo: 'venda', venda: vendaObrigatoria(partida, codigo, candidatos[0]) };
}

// Registra a venda: desconta o valor e põe no time. No leilão, passa para o
// próximo leilão; na repescagem, tira o personagem da lista.
export function aplicarVenda(partida: Partida, venda: Venda): Partida {
  const jogadores = partida.jogadores.map((j) =>
    j.id === venda.jogadorId
      ? { ...j, saldo: j.saldo - venda.valor, time: [...j.time, venda.codigo] }
      : j,
  );
  const base = { ...partida, jogadores, vendas: [...partida.vendas, venda] };

  if (venda.tipo === 'lanceRepescagem' || venda.tipo === 'sobraRepescagem') {
    return { ...base, repescagem: partida.repescagem.filter((c) => c !== venda.codigo) };
  }

  return {
    ...base,
    repescagem: venda.jogadorId === null ? [...partida.repescagem, venda.codigo] : partida.repescagem,
    indiceAtual: partida.indiceAtual + 1,
  };
}
