// Voz da narração: recebe um trecho da narração e devolve o áudio em MP3.
//
// GET /api/voz?t=<texto>   → audio/mpeg (&v=<voice_id> para testar outra voz)
// GET /api/voz?status=1    → { ok: true } quando há um jeito de gerar voz
// GET /api/voz?vozes=1     → vozes prontas da conta da ElevenLabs (para escolher o narrador)
//
// Caminhos, nesta ordem:
// 1. AI Gateway da Vercel (créditos da conta da Vercel; sem chave, pelo token
//    OIDC da própria Vercel), modelo ElevenLabs v3;
// 2. ElevenLabs direto, com ELEVENLABS_API_KEY.
//
// Variáveis opcionais: ELEVENLABS_VOICE_ID (a voz do narrador), MODELO_VOZ
// (padrão elevenlabs/eleven-v3 no Gateway) e ELEVENLABS_MODEL (padrão
// eleven_multilingual_v2 na ElevenLabs direta).

export const maxDuration = 60;

const SENHA_APP = 'all-in-draft-ap2';
const ELEVEN = 'https://api.elevenlabs.io';
const GATEWAY_VOZ = 'https://ai-gateway.vercel.sh/v4/ai/speech-model';
const MODELO_VOZ_GATEWAY = 'elevenlabs/eleven-v3';
const MODELO_PADRAO = 'eleven_multilingual_v2';
const LIMITE_TEXTO = 1500;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'x-all-in-draft',
};

function erro(status: number, mensagem: string) {
  return Response.json({ erro: mensagem }, { status, headers: { ...CORS, 'cache-control': 'no-store' } });
}

function tokenDoGateway(request: Request) {
  return process.env.AI_GATEWAY_API_KEY || request.headers.get('x-vercel-oidc-token') || process.env.VERCEL_OIDC_TOKEN;
}

// Sem ELEVENLABS_VOICE_ID: usa uma voz pronta da conta da ElevenLabs (masculina, se houver).
let vozDaConta: string | null = null;
async function escolherVoz() {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID;
  if (vozDaConta) return vozDaConta;
  const chave = process.env.ELEVENLABS_API_KEY;
  if (!chave) return null;
  for (const filtro of ['category=premade&gender=male', 'category=premade', '']) {
    const r = await fetch(`${ELEVEN}/v2/voices?page_size=20${filtro ? `&${filtro}` : ''}`, {
      headers: { 'xi-api-key': chave },
    });
    if (!r.ok) continue;
    const dados = (await r.json()) as { voices?: { voice_id: string }[] };
    const id = dados.voices?.[0]?.voice_id;
    if (id) {
      vozDaConta = id;
      return id;
    }
  }
  return null;
}

async function pelaGateway(token: string, texto: string, voz: string): Promise<ArrayBuffer> {
  const r = await fetch(GATEWAY_VOZ, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'ai-gateway-protocol-version': '0.0.1',
      'ai-speech-model-specification-version': '4',
      'ai-model-id': process.env.MODELO_VOZ || MODELO_VOZ_GATEWAY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ text: texto, voice: voz, outputFormat: 'mp3', language: 'pt' }),
  });
  if (!r.ok) throw new Error(`gateway ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const dados = (await r.json()) as { audio?: string };
  if (!dados.audio) throw new Error('gateway sem áudio');
  const bytes = Buffer.from(dados.audio, 'base64');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function pelaElevenLabs(chave: string, texto: string, voz: string): Promise<ArrayBuffer> {
  const r = await fetch(`${ELEVEN}/v1/text-to-speech/${encodeURIComponent(voz)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': chave, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: texto,
      model_id: process.env.ELEVENLABS_MODEL || MODELO_PADRAO,
      // Menos estabilidade e mais estilo = locutor mais dramático.
      voice_settings: { stability: 0.35, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true, speed: 1 },
    }),
  });
  if (!r.ok) throw new Error(`elevenlabs ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.arrayBuffer();
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // A senha vem no cabeçalho (app no celular) ou em ?k= (site: o <audio> do
  // navegador não manda cabeçalhos próprios).
  const senha = request.headers.get('x-all-in-draft') ?? url.searchParams.get('k');
  if (senha !== SENHA_APP) return erro(401, 'Não autorizado.');
  const token = tokenDoGateway(request);
  const chave = process.env.ELEVENLABS_API_KEY;
  const semCache = { ...CORS, 'cache-control': 'no-store' };

  if (url.searchParams.get('status')) {
    return Response.json({ ok: !!(token || chave), gateway: !!token, elevenlabs: !!chave }, { headers: semCache });
  }

  if (url.searchParams.get('vozes')) {
    if (!chave) return erro(503, 'Sem a chave da ElevenLabs para listar as vozes.');
    const r = await fetch(`${ELEVEN}/v2/voices?page_size=100&category=premade`, { headers: { 'xi-api-key': chave } });
    if (!r.ok) return erro(502, `Erro da ElevenLabs (${r.status}).`);
    const dados = (await r.json()) as {
      voices?: { voice_id: string; name: string; labels?: Record<string, string>; description?: string }[];
    };
    const vozes = (dados.voices ?? []).map((v) => ({ id: v.voice_id, nome: v.name, ...v.labels }));
    return Response.json({ escolhida: await escolherVoz(), vozes }, { headers: semCache });
  }

  if (!token && !chave) return erro(503, 'A voz de IA ainda não foi configurada no servidor.');

  const texto = (url.searchParams.get('t') ?? '').trim();
  if (!texto) return erro(400, 'Faltou o texto.');
  if (texto.length > LIMITE_TEXTO) return erro(413, 'Texto grande demais.');

  // ?v=<voice_id> escolhe outra voz só neste pedido (para comparar narradores).
  const pedida = url.searchParams.get('v');
  const voz = pedida && /^[A-Za-z0-9]{10,40}$/.test(pedida) ? pedida : await escolherVoz();
  if (!voz) return erro(503, 'Nenhuma voz definida (falta ELEVENLABS_VOICE_ID ou a chave da ElevenLabs).');

  const falhas: string[] = [];
  let audio: ArrayBuffer | null = null;
  let via = '';
  if (token) {
    try {
      audio = await pelaGateway(token, texto, voz);
      via = 'gateway';
    } catch (e) {
      falhas.push(e instanceof Error ? e.message : 'gateway falhou');
    }
  }
  if (!audio && chave) {
    try {
      audio = await pelaElevenLabs(chave, texto, voz);
      via = 'elevenlabs';
    } catch (e) {
      falhas.push(e instanceof Error ? e.message : 'elevenlabs falhou');
    }
  }
  if (!audio) {
    console.error('voz falhou:', falhas.join(' | '));
    return erro(502, `A voz de IA falhou (${falhas.join(' | ')}).`);
  }

  // O mesmo trecho gera sempre o mesmo áudio: a Vercel guarda em cache e não
  // gasta créditos de novo se a batalha for narrada outra vez.
  return new Response(audio, {
    headers: {
      ...CORS,
      'content-type': 'audio/mpeg',
      'x-voz-via': via,
      'cache-control': 'public, max-age=86400, s-maxage=2592000',
    },
  });
}
