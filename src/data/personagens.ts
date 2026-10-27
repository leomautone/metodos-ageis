// Dados dos 30 personagens do tema Animais (SCRUM-39).
// O campo "poder" já é o valor final normalizado (5 a 8): não recalcular.

export type Habitat = "terra" | "agua" | "ar";

export type Efeito =
  | { tipo: "primeiroAtaque"; valor: number }
  | { tipo: "quandoAtacado"; valor: number }
  | { tipo: "contraHabitat"; habitat: Habitat; valor: number }
  | { tipo: "contraPersonagens"; codigos: string[]; valor: number }
  | { tipo: "extraNaAgua"; valor: number }
  | { tipo: "ultimoDoTime"; valor: number }
  | { tipo: "aPartirDoRound3"; valor: number }
  | { tipo: "duelofinal"; valor: number }
  | { tipo: "esquivaPrimeiroAtaque" }
  | { tipo: "alcancaVoadores" }
  | { tipo: "veneno"; valor: number };

export type Habilidade = {
  texto: string;
  efeito: Efeito;
};

export type Personagem = {
  codigo: string;
  nome: string;
  habitats: Habitat[];
  lendario: boolean;
  ataque: number;
  durabilidade: number;
  velocidade: number;
  inteligencia: number;
  poder: number;
  // Lendários não têm habilidade.
  habilidade: Habilidade | null;
  descricao: string;
};

export const PERSONAGENS: Personagem[] = [
  { codigo: "ANI-001", nome: "Orca", habitats: ["agua"], lendario: true, ataque: 10, durabilidade: 9, velocidade: 7, inteligencia: 9, poder: 7.2,
    habilidade: null,
    descricao: "A maior predadora dos oceanos. Rápida, inteligente e com uma mordida capaz de derrubar presas muito maiores que ela. No mar, quase nada a enfrenta." },
  { codigo: "ANI-002", nome: "Elefante-africano", habitats: ["terra"], lendario: true, ataque: 10, durabilidade: 9, velocidade: 4, inteligencia: 8, poder: 7.3,
    habilidade: null,
    descricao: "O maior animal terrestre do planeta. Seis toneladas de músculo, presas de marfim e uma memória lendária. Quando investe, nada fica de pé no caminho." },
  { codigo: "ANI-003", nome: "Urso-polar", habitats: ["terra", "agua"], lendario: true, ataque: 10, durabilidade: 9, velocidade: 6, inteligencia: 5, poder: 7.3,
    habilidade: null,
    descricao: "Rei do gelo, à vontade tanto na terra quanto na água gelada. Nada por quilômetros e derruba focas com uma patada só." },
  { codigo: "ANI-004", nome: "Cachalote", habitats: ["agua"], lendario: true, ataque: 10, durabilidade: 10, velocidade: 3, inteligencia: 7, poder: 7.2,
    habilidade: null,
    descricao: "Gigante das profundezas, com a maior cabeça do reino animal. Mergulha a mais de mil metros para caçar lulas-gigantes. Lento, mas quase indestrutível." },
  { codigo: "ANI-005", nome: "Tigre-siberiano", habitats: ["terra"], lendario: false, ataque: 9, durabilidade: 7, velocidade: 8, inteligencia: 6, poder: 7.2,
    habilidade: { texto: "Emboscada: +1 no 1º ataque", efeito: { tipo: "primeiroAtaque", valor: 1 } },
    descricao: "O maior felino do mundo. Caçador solitário que se esconde na vegetação e ataca de surpresa. O primeiro golpe dele costuma ser o último." },
  { codigo: "ANI-006", nome: "Gorila-costas-prateadas", habitats: ["terra"], lendario: false, ataque: 9, durabilidade: 8, velocidade: 5, inteligencia: 8, poder: 7.1,
    habilidade: { texto: "Intimidação: +1 quando é atacado", efeito: { tipo: "quandoAtacado", valor: 1 } },
    descricao: "Força bruta com cérebro. Normalmente calmo, mas quando é provocado bate no peito, ruge e mostra que ninguém deveria tê-lo desafiado." },
  { codigo: "ANI-007", nome: "Urso-cinzento", habitats: ["terra"], lendario: false, ataque: 9, durabilidade: 8, velocidade: 6, inteligencia: 5, poder: 6.9,
    habilidade: { texto: "Pescador: +1 contra animais de água", efeito: { tipo: "contraHabitat", habitat: "agua", valor: 1 } },
    descricao: "Montanha de músculos com garras de dez centímetros. Passa horas nos rios pegando salmão, e por isso não tem medo de quem vem da água." },
  { codigo: "ANI-008", nome: "Onça-pintada", habitats: ["terra"], lendario: false, ataque: 8, durabilidade: 6, velocidade: 8, inteligencia: 6, poder: 6.8,
    habilidade: { texto: "+2 contra Crocodilo e Sucuri", efeito: { tipo: "contraPersonagens", codigos: ["ANI-012", "ANI-024"], valor: 2 } },
    descricao: "A mordida mais forte entre os grandes felinos. Caçadora das Américas, é especialista em atacar répteis, até jacarés e sucuris." },
  { codigo: "ANI-009", nome: "Rinoceronte-branco", habitats: ["terra"], lendario: false, ataque: 9, durabilidade: 10, velocidade: 5, inteligencia: 3, poder: 6.8,
    habilidade: { texto: "Carga: +1 no 1º ataque", efeito: { tipo: "primeiroAtaque", valor: 1 } },
    descricao: "Duas toneladas de couro grosso e um chifre na frente. Enxerga mal, mas quando começa a correr, a carga dele é impossível de parar." },
  { codigo: "ANI-010", nome: "Tubarão-branco", habitats: ["agua"], lendario: false, ataque: 9, durabilidade: 8, velocidade: 6, inteligencia: 4, poder: 6.8,
    habilidade: { texto: "Sente sangue: +1 no 1º ataque", efeito: { tipo: "primeiroAtaque", valor: 1 } },
    descricao: "O predador mais famoso do mar. Sente uma gota de sangue a quilômetros e ataca de baixo para cima, sem aviso." },
  { codigo: "ANI-011", nome: "Leão-africano", habitats: ["terra"], lendario: false, ataque: 8, durabilidade: 6, velocidade: 7, inteligencia: 6, poder: 6.7,
    habilidade: { texto: "Rei: +1 no duelo final", efeito: { tipo: "duelofinal", valor: 1 } },
    descricao: "O rei da savana. Não é o mais forte nem o mais rápido, mas mostra quem manda quando a luta chega ao momento decisivo." },
  { codigo: "ANI-012", nome: "Crocodilo-de-água-salgada", habitats: ["terra", "agua"], lendario: false, ataque: 10, durabilidade: 9, velocidade: 5, inteligencia: 3, poder: 6.8,
    habilidade: { texto: "Giro da morte: +1 a mais na água", efeito: { tipo: "extraNaAgua", valor: 1 } },
    descricao: "O maior réptil do planeta e a mordida mais forte já medida em um animal vivo. Espera parado na margem e, quando arrasta a presa para a água, gira até ela parar de lutar." },
  { codigo: "ANI-013", nome: "Chimpanzé", habitats: ["terra"], lendario: false, ataque: 6, durabilidade: 5, velocidade: 7, inteligencia: 9, poder: 6.5,
    habilidade: { texto: "Inteligente: +1 quando é atacado", efeito: { tipo: "quandoAtacado", valor: 1 } },
    descricao: "Um dos animais mais inteligentes do planeta. Usa ferramentas, lê o adversário e sabe se defender muito melhor do que o tamanho sugere." },
  { codigo: "ANI-014", nome: "Hipopótamo", habitats: ["terra", "agua"], lendario: false, ataque: 9, durabilidade: 9, velocidade: 4, inteligencia: 3, poder: 6.4,
    habilidade: { texto: "Territorial: +1 quando é atacado", efeito: { tipo: "quandoAtacado", valor: 1 } },
    descricao: "Parece tranquilo, mas é um dos animais mais perigosos da África. Defende seu pedaço de rio com uma fúria que assusta até crocodilos." },
  { codigo: "ANI-015", nome: "Hiena-malhada", habitats: ["terra"], lendario: false, ataque: 6, durabilidade: 6, velocidade: 7, inteligencia: 6, poder: 6.2,
    habilidade: { texto: "Persistente: +1 se for o último do time", efeito: { tipo: "ultimoDoTime", valor: 1 } },
    descricao: "Resistente e teimosa, não desiste de uma presa. Quando fica sozinha, luta com ainda mais força." },
  { codigo: "ANI-016", nome: "Polvo-gigante-do-pacífico", habitats: ["agua"], lendario: false, ataque: 5, durabilidade: 5, velocidade: 6, inteligencia: 10, poder: 6.2,
    habilidade: { texto: "Tinta: esquiva o 1º ataque recebido", efeito: { tipo: "esquivaPrimeiroAtaque" } },
    descricao: "Mestre do disfarce, com três corações e oito braços. Quando é ameaçado, solta uma nuvem de tinta e desaparece." },
  { codigo: "ANI-017", nome: "Canguru-vermelho", habitats: ["terra"], lendario: false, ataque: 6, durabilidade: 6, velocidade: 8, inteligencia: 4, poder: 6.1,
    habilidade: { texto: "Salto: esquiva o 1º ataque recebido", efeito: { tipo: "esquivaPrimeiroAtaque" } },
    descricao: "Atleta da Austrália. Pula até nove metros num salto e chuta com as duas patas traseiras. Difícil de acertar, sempre se esquivando." },
  { codigo: "ANI-018", nome: "Lula-gigante", habitats: ["agua"], lendario: false, ataque: 6, durabilidade: 6, velocidade: 6, inteligencia: 6, poder: 6.1,
    habilidade: { texto: "Tentáculos: +1 quando é atacada", efeito: { tipo: "quandoAtacado", valor: 1 } },
    descricao: "Criatura misteriosa das profundezas, com olhos do tamanho de pratos. Seus tentáculos agarram e não soltam quem tenta atacá-la." },
  { codigo: "ANI-019", nome: "Puma", habitats: ["terra"], lendario: false, ataque: 6, durabilidade: 5, velocidade: 7, inteligencia: 6, poder: 6.1,
    habilidade: { texto: "Salto: alcança animais de ar", efeito: { tipo: "alcancaVoadores" } },
    descricao: "Felino silencioso das montanhas. Salta mais de cinco metros de altura e consegue alcançar até aves que acham que estão seguras." },
  { codigo: "ANI-020", nome: "Lobo-cinzento", habitats: ["terra"], lendario: false, ataque: 5, durabilidade: 5, velocidade: 7, inteligencia: 7, poder: 6,
    habilidade: { texto: "Fôlego: +1 a partir do 3º round", efeito: { tipo: "aPartirDoRound3", valor: 1 } },
    descricao: "Caçador de resistência. Não precisa ser o mais rápido: persegue por horas e fica mais perigoso à medida que a luta se arrasta." },
  { codigo: "ANI-021", nome: "Harpia", habitats: ["ar"], lendario: false, ataque: 5, durabilidade: 4, velocidade: 8, inteligencia: 6, poder: 5.6,
    habilidade: { texto: "Garras: +1 no 1º ataque", efeito: { tipo: "primeiroAtaque", valor: 1 } },
    descricao: "A águia mais poderosa das Américas, com garras do tamanho das de um urso. Arranca macacos do alto das árvores num único ataque." },
  { codigo: "ANI-022", nome: "Barracuda-gigante", habitats: ["agua"], lendario: false, ataque: 6, durabilidade: 4, velocidade: 9, inteligencia: 3, poder: 5.8,
    habilidade: { texto: "Arrancada: +1 no 1º ataque", efeito: { tipo: "primeiroAtaque", valor: 1 } },
    descricao: "Torpedo dos mares tropicais. Fica parada até a presa chegar perto e então dispara numa arrancada que poucos peixes conseguem acompanhar." },
  { codigo: "ANI-023", nome: "Condor-dos-andes", habitats: ["ar"], lendario: false, ataque: 5, durabilidade: 5, velocidade: 7, inteligencia: 5, poder: 5.7,
    habilidade: { texto: "Plana alto: esquiva o 1º ataque recebido", efeito: { tipo: "esquivaPrimeiroAtaque" } },
    descricao: "Uma das maiores aves voadoras do mundo. Plana a alturas enormes sem bater as asas, longe do alcance de quase todo mundo." },
  { codigo: "ANI-024", nome: "Sucuri-verde", habitats: ["terra", "agua"], lendario: false, ataque: 7, durabilidade: 6, velocidade: 4, inteligencia: 4, poder: 5.7,
    habilidade: { texto: "Bote: alcança animais de ar", efeito: { tipo: "alcancaVoadores" } },
    descricao: "A cobra mais pesada do planeta. Vive entre a margem e a água e dá um bote rápido o bastante para pegar aves desprevenidas." },
  { codigo: "ANI-025", nome: "Bufo-real", habitats: ["ar"], lendario: false, ataque: 5, durabilidade: 4, velocidade: 7, inteligencia: 8, poder: 6,
    habilidade: { texto: "Voo silencioso: esquiva o 1º ataque recebido", efeito: { tipo: "esquivaPrimeiroAtaque" } },
    descricao: "A maior coruja do mundo, com garras capazes de pegar raposas. Caça à noite num voo silencioso: quando alguém tenta pegá-la, ela já não está mais lá." },
  { codigo: "ANI-026", nome: "Dragão-de-komodo", habitats: ["terra"], lendario: false, ataque: 6, durabilidade: 6, velocidade: 4, inteligencia: 4, poder: 5.4,
    habilidade: { texto: "Veneno: quem lutar com ele fica −1", efeito: { tipo: "veneno", valor: 1 } },
    descricao: "O maior lagarto do mundo. A mordida é venenosa: mesmo quem escapa dela sai enfraquecido." },
  { codigo: "ANI-027", nome: "Falcão-peregrino", habitats: ["ar"], lendario: false, ataque: 3, durabilidade: 2, velocidade: 10, inteligencia: 6, poder: 5.4,
    habilidade: { texto: "Mergulho: +2 no 1º ataque", efeito: { tipo: "primeiroAtaque", valor: 2 } },
    descricao: "O animal mais rápido do planeta. Mergulha a mais de 300 km/h, e o primeiro ataque dele é devastador." },
  { codigo: "ANI-028", nome: "Carcaju", habitats: ["terra"], lendario: false, ataque: 4, durabilidade: 4, velocidade: 6, inteligencia: 6, poder: 5.4,
    habilidade: { texto: "Feroz: +2 se for o último do time", efeito: { tipo: "ultimoDoTime", valor: 2 } },
    descricao: "Pequeno, mas absurdamente feroz. Enfrenta ursos e lobos sem pensar duas vezes e luta com mais raiva ainda quando está sozinho." },
  { codigo: "ANI-029", nome: "Águia-real", habitats: ["ar"], lendario: false, ataque: 3, durabilidade: 2, velocidade: 10, inteligencia: 5, poder: 5.4,
    habilidade: { texto: "Visão aguçada: +1 contra animais de terra", efeito: { tipo: "contraHabitat", habitat: "terra", valor: 1 } },
    descricao: "Visão oito vezes melhor que a humana. Do alto, enxerga qualquer movimento no chão e desce em cima de quem estiver em terra." },
  { codigo: "ANI-030", nome: "Texugo-do-mel", habitats: ["terra"], lendario: false, ataque: 4, durabilidade: 5, velocidade: 4, inteligencia: 5, poder: 5.4,
    habilidade: { texto: "Imune a veneno: +2 contra Komodo e Sucuri", efeito: { tipo: "contraPersonagens", codigos: ["ANI-026", "ANI-024"], valor: 2 } },
    descricao: "Não tem medo de nada. Couro grosso, garras fortes e imunidade a veneno de cobra fazem dele o terror das serpentes." },
];

export function buscarPersonagem(codigo: string): Personagem | undefined {
  const alvo = codigo.trim().toUpperCase();
  return PERSONAGENS.find((p) => p.codigo === alvo);
}
