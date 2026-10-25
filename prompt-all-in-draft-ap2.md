# Prompt — All-in Draft (versão da faculdade, AP2 de Métodos Ágeis)

Copie tudo abaixo da linha e cole no Claude do VS Code, com uma pasta vazia aberta.

---

CONTEXTO
Projeto da AP2 de Métodos Ágeis (Ibmec, 2026.2): o jogo "All-in Draft". De 3 a 5 jogadores montam times de 3 personagens num leilão e o app calcula a batalha entre os times. A versão física usa cartas impressas com QR code e moedas de papel; o app é o juiz da partida.
Esta é a versão da FACULDADE, num repositório NOVO e independente. O repositório antigo (github.com/leocamero/all-in-draft) vai para outro projeto: não altere nada nele e não copie código dele, só a ideia.
Nesta versão existe SÓ o tema Animais (30 personagens, ANI-001 a ANI-030). Não crie nada do tema Heróis e Vilões.

STACK
- React Native com Expo, em TypeScript.
- expo-camera para ler QR code.
- Estado da partida salvo localmente (AsyncStorage). O app precisa funcionar sem internet; só a narração por IA usa internet.
- Testes com Jest para o motor de batalha.
- Se algo desta lista for uma má ideia, me diga antes de começar.

COMO TRABALHAR
1. Primeiro me mostre um plano curto: estrutura de pastas, telas e a ordem de implementação. Só comece depois que eu aprovar.
2. Crie o repositório novo no GitHub (pergunte em qual conta e qual nome antes de criar; sugestão: all-in-draft-ap2).
3. Commits pequenos e com mensagem clara em português, um por funcionalidade.
4. Explique em linguagem simples o que fez a cada etapa; eu ainda estou aprendendo Git e React Native.

REGRAS DO JOGO (Regras v8)
- 3 a 5 jogadores, cada um com R$ 20,00. Cada um monta um time de 3 personagens.
- Personagens disponíveis na partida = número de jogadores × 3, sorteados entre os 30 e apresentados um de cada vez, em ordem aleatória.
- Leilão: lance mínimo R$ 0,00; incremento mínimo de R$ 1,00; ninguém dá lance maior que o próprio saldo. Cronômetro de 15 s por personagem; cada lance novo reinicia o cronômetro em 5 s. Ao fim, o maior lance leva. Empate: leva quem anunciou primeiro. Lance de R$ 0 sem disputa: leva de graça.
- Personagem sem lance vai para a repescagem (no máximo 3). Com a repescagem cheia, o personagem sem lance vai obrigatoriamente para o jogador com mais vagas no time; empate: os empatados jogam um dado e quem tirar o MENOR fica com ele. Custa R$ 1,00 (grátis se o saldo for zero).
- Repescagem: os personagens são distribuídos entre quem ainda não completou o time. Quem tem mais dinheiro escolhe primeiro; empate: dado, o MAIOR escolhe primeiro. Se ninguém quiser um personagem, o jogador com menos dinheiro fica com ele. Cada personagem da repescagem custa R$ 1,00 (grátis com saldo zero).
- Registro: quem ganha um personagem escaneia o QR code da carta, que contém só o código (ex.: ANI-001). Se o QR não ler, digita o código. O app registra no time e desconta o valor.
- Qualquer jogador pode consultar no app, a qualquer momento, os atributos, o Poder, a habilidade e se o personagem é Lendário. A carta impressa não mostra nada disso.

MOTOR DE BATALHA (Modelo de Batalha v7) — implementar como módulo puro em TypeScript, sem dependência de tela, com gerador aleatório que aceite semente (para testes)
- Use o campo "poder" dos dados como está. Ele já é o valor final (o Poder bruto 30/25/25/20 foi normalizado para a faixa de 5 a 8, com teto na Orca e piso de 5,4). Não recalcule.
- Zonas: Terra, Água e Ar. No início, cada personagem está no próprio habitat. Se atacante e alvo têm habitat em comum, o duelo é nesse habitat; se não, é no habitat de quem é atacado. No próprio habitat: +1 de Poder. Fora dele: −2.
- Alcance: habitat em comum sempre se alcança. Se não houver, quem voa (ar) alcança quem tem terra. Fora isso, só alcança quem voa quem tem a habilidade "alcancaVoadores". Quem ninguém alcança continua vivo.
- Duelo: Força = 0,8 × Poder efetivo + 0,2 × dado (1 a 10, um para cada lado). Maior Força vence; empate exato rola de novo. O perdedor é eliminado (o atacante também pode perder).
- Poder efetivo = Poder + zona + habilidades + última resistência + condição do duelo final − veneno acumulado.
- Chance de vitória num duelo: calcule a probabilidade exata a partir dos dois Poderes efetivos (100 combinações de dados, com empate repetindo).
- Rounds normais (no máximo 5): antes de cada round, se nenhum personagem vivo tiver um alvo alcançável com pelo menos 40% de chance, o round não acontece e vai direto para o duelo final. Em cada round, a ordem dos personagens vivos é sorteada; na sua vez, cada um escolhe o alvo alcançável com MAIOR chance e só ataca se ela for de pelo menos 40%. Cada um ataca no máximo uma vez por round e pode ser atacado várias vezes.
- Última resistência: quando um personagem fica sozinho no time, ganha +1 até o fim. Soma com habilidades "ultimoDoTime".
- Duelo final (se sobrar mais de um time): a arena fecha numa zona neutra; todos se alcançam e não há bônus de zona. Sorteie uma condição entre os habitats dos sobreviventes (cada habitat presente com a mesma chance): quem tem esse habitat ganha +2 (terra ou agua) ou +1,5 (ar) até o fim. Agora todos atacam na sua vez, mesmo com menos de 40%, até sobrar um time.
- Vence o time com pelo menos um sobrevivente. Se só sobrar um time antes do duelo final, termina na hora.
- Zebra: marque o evento com zebra = true quando o vencedor do duelo tinha menos Poder efetivo.
- Chance de cada time antes da luta: simule a batalha 2.000 vezes e mostre a porcentagem de vitórias.
- O motor devolve uma lista de eventos estruturados (duelo, esquiva, ultima_resistencia, arena_fecha, condicao_final, vencedor), no formato:
  { round, tipo, zona, atacante, alvo, poder: [a, b], eliminado, habilidades_usadas: [...], zebra }

HABILIDADES (o campo "efeito" de cada personagem)
- primeiroAtaque (valor): bônus só na primeira vez que o personagem ataca na partida.
- quandoAtacado (valor): bônus sempre que é o alvo.
- contraHabitat (habitat, valor): bônus contra qualquer adversário que tenha esse habitat.
- contraPersonagens (codigos, valor): bônus só contra esses personagens.
- extraNaAgua (valor): bônus extra quando o duelo é na zona Água, somado ao bônus de casa.
- ultimoDoTime (valor): bônus quando é o único vivo do time (soma com a última resistência).
- aPartirDoRound3 (valor): vale do 3º round em diante, incluindo o duelo final.
- duelofinal (valor): vale só no duelo final.
- esquivaPrimeiroAtaque: o primeiro ataque recebido falha; para o atacante, conta como o 1º ataque dele.
- alcancaVoadores: pode atacar personagens de Ar mesmo sendo de Terra ou Água.
- veneno (valor): depois de qualquer duelo com ele, o adversário que sobreviver perde o valor até o fim da batalha (acumula; vale mesmo se o venenoso perder).
- Lendários (habilidade null) não têm habilidade.
Escreva testes para cada habilidade e para os casos especiais acima.

NARRAÇÃO (SCRUM-27 e SCRUM-28)
- Depois da batalha, o app manda a lista de eventos para uma IA, que narra em português, num tom épico e levemente fantasioso. A IA nunca muda resultados, não inventa eliminações nem habilidades, não mostra números no meio da luta (só as chances do início), revela cada habilidade só quando é usada, trata zebra como virada histórica, anuncia a última resistência, termina cada round com suspense e descreve a condição final como evento do cenário (terremoto, enchente ou vendaval). De 80 a 150 palavras por round e de 100 a 200 no duelo final.
- Cenário Animais: Terra = savana aberta com capim alto; Água = um lago fundo ligado a um rio; Ar = o céu acima do penhasco; zona neutra = uma clareira no centro da savana.
- A chave da API NÃO pode ficar dentro do app. Proponha a forma mais simples de esconder a chave (por exemplo, uma função serverless na Vercel) e me pergunte antes de criar.
- Modo sem narração: se a IA falhar ou não houver internet, o app mostra os mesmos eventos em texto simples, round a round.

TELAS
1. Início: nova partida, continuar partida salva, consultar personagens.
2. Nova partida (SCRUM-19): 3 a 5 jogadores com nome; o app sorteia os personagens da partida.
3. Leilão (SCRUM-21 e SCRUM-23): mostra o personagem da vez (código e nome), o cronômetro 15 s / 5 s, o lance atual e o saldo de cada jogador; registra o vencedor e o valor; trata personagem sem lance e repescagem.
4. Registro por QR (SCRUM-20): câmera lê o código, confirma o personagem e o jogador; campo para digitar o código como plano B.
5. Times (SCRUM-25): os 3 personagens de cada jogador e o saldo final.
6. Consulta de personagens (SCRUM-40): lista com busca e filtro por habitat; detalhe com atributos, Poder, habilidade e marca de Lendário.
7. Batalha (SCRUM-24 e SCRUM-26): chances de cada time antes, eventos round a round (ou a narração) e o resultado final com o personagem que ficou de pé.

IDENTIDADE VISUAL (igual às cartas)
- Fundo escuro #15131C, painéis #1F1C28, dourado #D4AF37, dourado claro #F3DC8B, texto #E9E4D8.
- Cor por habitat: Terra #4E9A5A, Água #2F7FC1, Ar #A9D3EE (ícones com as letras T, A e AR).
- Fontes: Cinzel (nomes e títulos), Oswald (números e códigos), Inter ou DM Sans (textos).
- Clima de leilão e cassino: bordas douradas, cantos com ornamentos.

DADOS DOS 30 PERSONAGENS (SCRUM-39) — crie src/data/personagens.ts exatamente com estes valores e tipos
type Habitat = "terra" | "agua" | "ar";
export const PERSONAGENS = [
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
] as const;
(Defina os tipos TypeScript certinhos para Personagem, Habilidade e Efeito em vez de usar "as const", se ficar melhor.)

ENTREGA
Ao final de cada etapa, me diga o que testar no celular (Expo Go) e qual issue do Jira posso mover para concluída.
