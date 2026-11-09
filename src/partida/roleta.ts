import type { Aleatorio } from '@/partida/leilao';

// Roleta do desempate. A roda tem uma fatia por jogador, a partir do topo, no
// sentido horário; o ponteiro fica no topo. Girar a roda R graus no sentido
// horário põe embaixo do ponteiro o ponto que estava em −R graus.

export function centroDaFatia(indice: number, fatias: number) {
  return ((indice + 0.5) * 360) / fatias;
}

function normalizar(angulo: number) {
  return ((angulo % 360) + 360) % 360;
}

// Fatia que fica embaixo do ponteiro com a roda girada `rotacao` graus.
export function fatiaNoPonteiro(rotacao: number, fatias: number) {
  return Math.floor(normalizar(-rotacao) / (360 / fatias)) % fatias;
}

// Sorteia quem ganha (chances iguais) e calcula onde a roda para: algumas voltas
// completas a partir de onde está e um ponto qualquer dentro da fatia sorteada.
export function sortearGiro(rotacaoAtual: number, fatias: number, aleatorio: Aleatorio = Math.random, voltas = 5) {
  const indice = Math.min(fatias - 1, Math.floor(aleatorio() * fatias));
  const largura = 360 / fatias;
  // Longe das bordas, para não ficar em dúvida sobre onde parou.
  const desvio = (aleatorio() - 0.5) * largura * 0.7;
  const parada = normalizar(-(centroDaFatia(indice, fatias) + desvio));
  const inicio = Math.ceil(rotacaoAtual / 360) * 360;
  return { indice, rotacao: inicio + voltas * 360 + parada };
}
