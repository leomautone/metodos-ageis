import type { Aleatorio } from '@/partida/leilao';

// Roletas do jogo (desempate e bênçãos/maldições). A roda tem uma fatia por
// opção, a partir do topo, no sentido horário; o ponteiro fica no topo. Girar
// a roda R graus no sentido horário põe embaixo do ponteiro o ponto que estava
// em −R graus. Cada fatia tem um peso: a largura e a chance são proporcionais a ele.

export type Fatia = { inicio: number; fim: number };

// Começo e fim (em graus) de cada fatia, proporcionais aos pesos.
export function fatiasPorPeso(pesos: number[]): Fatia[] {
  const total = pesos.reduce((a, b) => a + b, 0);
  let inicio = 0;
  return pesos.map((p) => {
    const fatia = { inicio, fim: inicio + (360 * p) / total };
    inicio = fatia.fim;
    return fatia;
  });
}

export function centroDaFatia(indice: number, fatias: number) {
  return ((indice + 0.5) * 360) / fatias;
}

function normalizar(angulo: number) {
  return ((angulo % 360) + 360) % 360;
}

// Fatia que fica embaixo do ponteiro com a roda girada `rotacao` graus.
export function fatiaNoPonteiroPorPeso(rotacao: number, pesos: number[]) {
  const angulo = normalizar(-rotacao);
  const indice = fatiasPorPeso(pesos).findIndex((f) => angulo >= f.inicio && angulo < f.fim);
  return indice === -1 ? pesos.length - 1 : indice;
}

export function fatiaNoPonteiro(rotacao: number, fatias: number) {
  return fatiaNoPonteiroPorPeso(rotacao, Array(fatias).fill(1));
}

// Sorteia a fatia (chance proporcional ao peso) e calcula onde a roda para:
// algumas voltas completas a partir de onde está e um ponto dentro da fatia sorteada.
export function sortearGiroPorPeso(
  rotacaoAtual: number,
  pesos: number[],
  aleatorio: Aleatorio = Math.random,
  voltas = 5,
) {
  const total = pesos.reduce((a, b) => a + b, 0);
  let sorteio = aleatorio() * total;
  let indice = pesos.length - 1;
  for (let i = 0; i < pesos.length; i++) {
    if (sorteio < pesos[i]) {
      indice = i;
      break;
    }
    sorteio -= pesos[i];
  }
  const { inicio, fim } = fatiasPorPeso(pesos)[indice];
  // Longe das bordas, para não ficar em dúvida sobre onde parou.
  const ponto = inicio + (fim - inicio) * (0.15 + aleatorio() * 0.7);
  const parada = normalizar(-ponto);
  const comeco = Math.ceil(rotacaoAtual / 360) * 360;
  return { indice, rotacao: comeco + voltas * 360 + parada };
}

// Chances iguais para todos (roleta do desempate).
export function sortearGiro(rotacaoAtual: number, fatias: number, aleatorio: Aleatorio = Math.random, voltas = 5) {
  return sortearGiroPorPeso(rotacaoAtual, Array(fatias).fill(1), aleatorio, voltas);
}
