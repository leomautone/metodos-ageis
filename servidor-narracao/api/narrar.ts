import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Narração épica da batalha do All-in Draft.
//
// O app calcula a batalha no celular (motor com dado, ordem sorteada e condição
// final) e manda aqui só o roteiro do que aconteceu. O Claude transforma o
// roteiro em narração; ele nunca decide nem muda resultados. A chave da API
// fica só aqui, na variável de ambiente ANTHROPIC_API_KEY da Vercel.

export const maxDuration = 120;

const MODELO = 'claude-opus-5-5';
// Senha simples que o app manda: não é segredo de verdade (fica dentro do app),
// só evita que qualquer pessoa que ache o endereço gaste a chave sem querer.
const SENHA_APP = 'all-in-draft-ap2';
const LIMITE_BYTES = 40_000;

const Lutador = z.object({ nome: z.string().max(60), habitats: z.array(z.string().max(10)).max(3) });

const EventoRoteiro = z.object({
  tipo: z.enum([
    'duelo',
    'vida_extra',
    'baixa',
    'esquiva',
    'ultima_resistencia',
    'arena_fecha',
    'condicao_final',
    'vencedor',
  ]),
  zona: z.string().max(20).nullable(),
  atacante: Lutador.nullable(),
  alvo: Lutador.nullable(),
  vencedor: z.string().max(60).nullable(),
  eliminado: z.string().max(60).nullable(),
  salvo: z.string().max(60).nullable().optional(),
  habilidades: z.array(z.object({ dono: z.string().max(60), texto: z.string().max(120) })).max(6),
  zebra: z.boolean(),
  jogador: z.string().max(40).nullable(),
});

const Roteiro = z.object({
  jogadores: z
    .array(
      z.object({
        nome: z.string().max(40),
        time: z.array(z.string().max(60)).max(3),
        sorte: z.array(z.string().max(220)).max(30),
      }),
    )
    .min(1)
    .max(5),
  rounds: z
    .array(z.object({ round: z.string().max(10), eventos: z.array(EventoRoteiro).max(40) }))
    .min(1)
    .max(8),
});

// Formato da resposta: um bloco por evento narrado; combates trazem quem saiu.
const SCHEMA_RESPOSTA = {
  type: 'object',
  additionalProperties: false,
  required: ['rounds'],
  properties: {
    rounds: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['round', 'blocos'],
        properties: {
          round: { type: 'string' },
          blocos: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['texto', 'fora'],
              properties: {
                texto: { type: 'string' },
                fora: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
  },
} as const;

const Resposta = z.object({
  rounds: z.array(
    z.object({
      round: z.string(),
      blocos: z.array(z.object({ texto: z.string(), fora: z.string().nullable() })),
    }),
  ),
});

const SISTEMA = `Você é o narrador oficial do All-in Draft, um jogo de cartas em que animais lutam numa arena selvagem. Escreva em português do Brasil, num tom épico, fantasioso e cômico, como um locutor de luta lendária misturado com um bardo exagerado.

Você recebe o roteiro da batalha, já decidida por um motor de regras. Sua tarefa é só narrar.

Regras que nunca podem ser quebradas:
- Nunca mude resultados: quem vence, quem é eliminado, a ordem dos acontecimentos e as habilidades usadas são exatamente os do roteiro.
- Nunca invente eliminações, habilidades, golpes decisivos que contradigam o roteiro, nem animais que não estão no roteiro.
- Não mostre números no meio da luta: nada de porcentagens, poder ou dados.
- Use os nomes dos animais e dos jogadores exatamente como vêm no roteiro.

Como narrar:
- Narre round a round, na mesma ordem e com os mesmos rounds do roteiro.
- Cada round começa com um bloco de abertura curto e dramático (com "fora": null).
- Cada evento do roteiro vira um bloco, na mesma ordem.
- Combate ("duelo"): de 50 a 90 palavras, com movimento, som, cenário e humor. Revele a habilidade só quando ela for usada, dando o nome dela. O campo "fora" é o nome exato do animal eliminado; não escreva "FORA!" no texto, o app acrescenta. Só duelos e baixas têm "fora"; todos os outros blocos têm "fora": null.
- Zebra (zebra: true): trate como uma virada histórica, inacreditável.
- Vida extra ("vida_extra"): um duelo em que o "salvo" perdeu, mas, por ser o último animal do time, gastou a vida extra ganha na roleta e continua vivo. Narre a derrota e o renascimento milagroso; ninguém sai ("fora": null).
- Baixa ("baixa"): maldição da roleta; o "eliminado" cai antes da primeira luta, sem combate (um raio, uma névoa, uma raiz amaldiçoada...). Aqui "fora" é o nome exato dele.
- Esquiva: o atacante erra feio e o alvo escapa com a habilidade; ninguém sai ("fora": null).
- Última resistência: anuncie com emoção que o animal está sozinho pelo time daquele jogador.
- Arena fecha e condição final: descreva como evento do cenário (terremoto para terra, enchente para água, vendaval para ar) e diga quem se beneficia. Se a condição final tiver "jogador", foi esse jogador quem a escolheu com o Senhor da Arena: dê o crédito a esse jogador.
- Vencedor: um bloco final de glória para o time do jogador vencedor, de 60 a 120 palavras.
- Cada round normal termina com um bloco curto de suspense ("fora": null), exceto o último, que termina no bloco do vencedor.
- Se um jogador tiver bênçãos ou maldições, você pode citá-las como sinais do destino, sem números.
- Varie muito: cada duelo com outra imagem, outro verbo, outra piada. Nada de repetir aberturas ou fórmulas entre blocos.

Cenário: Terra é a savana aberta de capim alto; Água é um lago fundo ligado a um rio; Ar é o céu acima do penhasco; a zona neutra é uma clareira no centro da savana.`;

// Libera a chamada pela versão web do app (no celular isso não faz diferença).
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-all-in-draft',
};

function erro(status: number, mensagem: string) {
  return Response.json({ erro: mensagem }, { status, headers: CORS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  if (request.headers.get('x-all-in-draft') !== SENHA_APP) return erro(401, 'Não autorizado.');
  if (!process.env.ANTHROPIC_API_KEY) return erro(503, 'A chave da IA ainda não foi configurada no servidor.');

  const corpo = await request.text();
  if (corpo.length > LIMITE_BYTES) return erro(413, 'Roteiro grande demais.');

  let roteiro: z.infer<typeof Roteiro>;
  try {
    roteiro = Roteiro.parse(JSON.parse(corpo));
  } catch {
    return erro(400, 'Roteiro inválido.');
  }

  const client = new Anthropic();
  try {
    const resposta = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA_RESPOSTA } },
      system: SISTEMA,
      messages: [
        {
          role: 'user',
          content: `Narre esta batalha. Roteiro em JSON:\n${JSON.stringify(roteiro)}`,
        },
      ],
    });

    if (resposta.stop_reason === 'refusal') return erro(502, 'A IA recusou narrar esta batalha.');
    if (resposta.stop_reason === 'max_tokens') return erro(502, 'A narração ficou longa demais.');

    const texto = resposta.content.find((b) => b.type === 'text');
    if (!texto || texto.type !== 'text') return erro(502, 'A IA não devolveu texto.');
    const narracao = Resposta.parse(JSON.parse(texto.text));
    return Response.json({ modelo: resposta.model, ...narracao }, { headers: CORS });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return erro(503, 'A chave da IA é inválida.');
    if (e instanceof Anthropic.RateLimitError) return erro(429, 'A IA está ocupada; tente de novo.');
    if (e instanceof Anthropic.APIError) return erro(502, `Erro da IA (${e.status}).`);
    if (e instanceof z.ZodError || e instanceof SyntaxError) return erro(502, 'A IA devolveu um formato inesperado.');
    throw e;
  }
}
