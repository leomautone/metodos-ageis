// Roleta de bênçãos e maldições, girada depois do draft com o dinheiro que sobrou.
//
// Para mudar a roleta, edite só esta lista:
// - peso: a chance em % (a soma dá 100). A fatia na roda é proporcional a ele;
// - efeito: o que o item faz na batalha (os tipos estão em EfeitoSorte).
// Os 11 primeiros itens são as ideias do grupo; os 6 últimos, os do esboço
// (Poder para o time todo), dividindo os 26% que sobravam.

export type AtributoSorte = "durabilidade" | "velocidade" | "inteligencia";

export type EfeitoSorte =
  // Soma (ou tira) Poder de todos os animais do time.
  | { tipo: "poderTime"; valor: number }
  // Poder para o animal mais fraco (ou tira do mais forte) do time.
  | { tipo: "poderMaisFraco"; valor: number }
  | { tipo: "poderMaisForte"; valor: number }
  // +1 num atributo de todos os animais do time; vira Poder pela fórmula oficial.
  | { tipo: "atributoTime"; atributo: AtributoSorte; valor: number }
  // O último animal vivo do time sobrevive a uma derrota.
  | { tipo: "vidaExtra" }
  // Um animal sorteado do time cai antes da primeira luta.
  | { tipo: "perdePersonagem" }
  // O jogador escolhe a condição do duelo final (terra, água ou ar).
  | { tipo: "escolheTerreno" }
  // Giros de graça na roleta.
  | { tipo: "girosExtras"; giros: number }
  // Troca um animal sorteado com um animal sorteado de outro jogador sorteado.
  | { tipo: "troca" }
  // Perdeu a vez: nada acontece.
  | { tipo: "nada" };

export type ItemSorte = {
  id: string;
  nome: string;
  // Rótulo curto que cabe na fatia da roda.
  curto: string;
  descricao: string;
  tipo: "bencao" | "maldicao" | "neutro";
  peso: number;
  efeito: EfeitoSorte;
};

export const ITENS_SORTE: ItemSorte[] = [
  {
    id: "forca-ao-fraco",
    nome: "Força ao Mais Fraco",
    curto: "+1 no fraco",
    descricao: "O animal mais fraco do time ganha +1 de Poder.",
    tipo: "bencao",
    peso: 12.5,
    efeito: { tipo: "poderMaisFraco", valor: 1 },
  },
  {
    id: "perdeu-a-vez",
    nome: "Perdeu a Vez",
    curto: "Perdeu a vez",
    descricao: "Nada acontece. Os R$ 5 foram embora com o vento.",
    tipo: "neutro",
    peso: 12.5,
    efeito: { tipo: "nada" },
  },
  {
    id: "couro-de-pedra",
    nome: "Couro de Pedra",
    curto: "+1 durab.",
    descricao: "+1 de Durabilidade para todos os animais do time.",
    tipo: "bencao",
    peso: 10.5,
    efeito: { tipo: "atributoTime", atributo: "durabilidade", valor: 1 },
  },
  {
    id: "maldicao-pantano",
    nome: "Maldição do Pântano",
    curto: "Pântano",
    descricao: "−0,5 de Poder para todo o time.",
    tipo: "maldicao",
    peso: 6.5,
    efeito: { tipo: "poderTime", valor: -0.5 },
  },
  {
    id: "pes-de-vento",
    nome: "Pés de Vento",
    curto: "+1 veloc.",
    descricao: "+1 de Velocidade para todos os animais do time.",
    tipo: "bencao",
    peso: 10,
    efeito: { tipo: "atributoTime", atributo: "velocidade", valor: 1 },
  },
  {
    id: "queda-do-forte",
    nome: "Queda do Mais Forte",
    curto: "−1 no forte",
    descricao: "O animal mais forte do time perde 1 de Poder.",
    tipo: "maldicao",
    peso: 5.5,
    efeito: { tipo: "poderMaisForte", valor: -1 },
  },
  {
    id: "mente-ancestral",
    nome: "Mente Ancestral",
    curto: "+1 intelig.",
    descricao: "+1 de Inteligência para todos os animais do time.",
    tipo: "bencao",
    peso: 10,
    efeito: { tipo: "atributoTime", atributo: "inteligencia", valor: 1 },
  },
  {
    id: "troca-do-destino",
    nome: "Troca do Destino",
    curto: "Troca",
    descricao:
      "Um animal seu, sorteado, troca de lugar com um animal sorteado de outro jogador sorteado.",
    tipo: "neutro",
    peso: 5.5,
    efeito: { tipo: "troca" },
  },
  {
    id: "vento-a-favor",
    nome: "Vento a Favor",
    curto: "Vento a favor",
    descricao: "+0,5 de Poder para todo o time.",
    tipo: "bencao",
    peso: 6.5,
    efeito: { tipo: "poderTime", valor: 0.5 },
  },
  {
    id: "praga-mosquitos",
    nome: "Praga de Mosquitos",
    curto: "Mosquitos",
    descricao: "−0,5 de Poder para todo o time.",
    tipo: "maldicao",
    peso: 4.5,
    efeito: { tipo: "poderTime", valor: -0.5 },
  },
  {
    id: "giros-extras",
    nome: "Giros Extras",
    curto: "+2 giros",
    descricao: "Mais dois giros de graça na roleta, além deste.",
    tipo: "bencao",
    peso: 4,
    efeito: { tipo: "girosExtras", giros: 2 },
  },
  {
    id: "eclipse-sombrio",
    nome: "Eclipse Sombrio",
    curto: "Eclipse",
    descricao: "−1 de Poder para todo o time.",
    tipo: "maldicao",
    peso: 2,
    efeito: { tipo: "poderTime", valor: -1 },
  },
  {
    id: "lua-cheia",
    nome: "Lua Cheia",
    curto: "Lua cheia",
    descricao: "+0,5 de Poder para todo o time.",
    tipo: "bencao",
    peso: 4.5,
    efeito: { tipo: "poderTime", valor: 0.5 },
  },
  {
    id: "senhor-da-arena",
    nome: "Senhor da Arena",
    curto: "Escolhe arena",
    descricao:
      "Você escolhe como a arena fecha no duelo final: terremoto (terra), enchente (água) ou vendaval (ar).",
    tipo: "bencao",
    peso: 2,
    efeito: { tipo: "escolheTerreno" },
  },
  {
    id: "baixa-antes-da-luta",
    nome: "Baixa Antes da Luta",
    curto: "Baixa",
    descricao:
      "Um animal sorteado do time cai antes da primeira luta (nunca o último que sobrou).",
    tipo: "maldicao",
    peso: 0.5,
    efeito: { tipo: "perdePersonagem" },
  },
  {
    id: "bencao-ancestrais",
    nome: "Bênção dos Ancestrais",
    curto: "Ancestrais",
    descricao: "+1 de Poder para todo o time.",
    tipo: "bencao",
    peso: 2,
    efeito: { tipo: "poderTime", valor: 1 },
  },
  {
    id: "vida-extra",
    nome: "Vida Extra",
    curto: "Vida extra",
    descricao:
      "Quando sobrar só um animal no time, ele sobrevive a uma derrota.",
    tipo: "bencao",
    peso: 1,
    efeito: { tipo: "vidaExtra" },
  },
];

export function buscarItemSorte(id: string) {
  return ITENS_SORTE.find((i) => i.id === id);
}

// Fórmula oficial do Poder bruto: Ataque 30%, Durabilidade 25%, Velocidade 25%,
// Inteligência 20%. Na escala do Poder normalizado (5 a 8), cada ponto bruto
// vale cerca de 0,07 (ajuste feito com os 30 personagens).
const PESO_ATRIBUTO: Record<AtributoSorte, number> = {
  durabilidade: 2.5,
  velocidade: 2.5,
  inteligencia: 2,
};
const PODER_POR_PONTO_BRUTO = 0.07;

export function poderDoAtributo(atributo: AtributoSorte, valor: number) {
  return valor * PESO_ATRIBUTO[atributo] * PODER_POR_PONTO_BRUTO;
}

// Chance em % para mostrar na tela: "0,5%", "12,5%", "10%".
export function chanceDoItem(item: ItemSorte) {
  const total = ITENS_SORTE.reduce((s, i) => s + i.peso, 0);
  const pct = Math.round((item.peso / total) * 1000) / 10;
  return `${String(pct).replace(".", ",")}%`;
}
