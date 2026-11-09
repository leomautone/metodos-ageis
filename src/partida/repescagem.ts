import { vagas, type Aleatorio, type ResultadoSemLance } from '@/partida/leilao';
import type { Partida, Venda } from '@/partida/partida';

// Repescagem, sem dependência de tela: depois do leilão, os personagens sem lance
// voltam à mesa um de cada vez, em ordem sorteada, com 10 s de lance.

export const TEMPO_REPESCAGEM_MS = 10_000;
export const CUSTO_SOBRA = 1;

// Sorteia a ordem dos personagens; o primeiro da lista é o da vez.
export function sortearRepescagem(partida: Partida, aleatorio: Aleatorio = Math.random): Partida {
  const ordem = [...partida.repescagem];
  for (let i = ordem.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  return { ...partida, repescagem: ordem, repescagemSorteada: true };
}

export function cartaDaVez(partida: Partida) {
  return partida.repescagem[0] ?? null;
}

export function venderNaRepescagem(codigo: string, jogadorId: number, valor: number): Venda {
  return { codigo, jogadorId, valor, tipo: 'lanceRepescagem' };
}

// Ninguém deu lance: fica com quem tem menos dinheiro entre quem ainda tem vaga.
export function candidatosSobra(partida: Partida) {
  const comVaga = partida.jogadores.filter((j) => vagas(j) > 0);
  const menor = Math.min(...comVaga.map((j) => j.saldo));
  return comVaga.filter((j) => j.saldo === menor).map((j) => j.id);
}

// Quem fica com a sobra paga R$ 1, grátis com saldo zero.
export function vendaSobra(partida: Partida, codigo: string, jogadorId: number): Venda {
  const saldo = partida.jogadores.find((j) => j.id === jogadorId)!.saldo;
  return { codigo, jogadorId, valor: saldo > 0 ? CUSTO_SOBRA : 0, tipo: 'sobraRepescagem' };
}

// Sem lance na repescagem: vai direto para quem tem menos dinheiro; empate, roleta.
export function semLanceNaRepescagem(partida: Partida, codigo: string): ResultadoSemLance {
  const candidatos = candidatosSobra(partida);
  if (candidatos.length > 1) return { tipo: 'roleta', candidatos };
  return { tipo: 'venda', venda: vendaSobra(partida, codigo, candidatos[0]) };
}
