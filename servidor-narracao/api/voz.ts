// Voz da narração (ElevenLabs): recebe um trecho da narração e devolve o áudio
// em MP3. A chave fica só aqui, na variável ELEVENLABS_API_KEY da Vercel.
//
// GET /api/voz?t=<texto>   → audio/mpeg
// GET /api/voz?status=1    → { ok: true } quando a chave está configurada
//
// Variáveis opcionais: ELEVENLABS_VOICE_ID (a voz escolhida no site da
// ElevenLabs) e ELEVENLABS_MODEL (padrão eleven_multilingual_v2).

export const maxDuration = 60;

const SENHA_APP = 'all-in-draft-ap2';
const API = 'https://api.elevenlabs.io';
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

// Sem ELEVENLABS_VOICE_ID: usa uma voz pronta da própria conta (masculina, se houver).
let vozDaConta: string | null = null;
async function escolherVoz(chave: string) {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID;
  if (vozDaConta) return vozDaConta;
  for (const filtro of ['category=premade&gender=male', 'category=premade', '']) {
    const r = await fetch(`${API}/v2/voices?page_size=20${filtro ? `&${filtro}` : ''}`, {
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

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  if (request.headers.get('x-all-in-draft') !== SENHA_APP) return erro(401, 'Não autorizado.');
  const chave = process.env.ELEVENLABS_API_KEY;
  if (!chave) return erro(503, 'A chave da ElevenLabs ainda não foi configurada no servidor.');

  const url = new URL(request.url);
  if (url.searchParams.get('status')) return Response.json({ ok: true }, { headers: { ...CORS, 'cache-control': 'no-store' } });

  const texto = (url.searchParams.get('t') ?? '').trim();
  if (!texto) return erro(400, 'Faltou o texto.');
  if (texto.length > LIMITE_TEXTO) return erro(413, 'Texto grande demais.');

  const voz = await escolherVoz(chave);
  if (!voz) return erro(502, 'Nenhuma voz disponível na conta da ElevenLabs.');

  const resposta = await fetch(`${API}/v1/text-to-speech/${encodeURIComponent(voz)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': chave, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: texto,
      model_id: process.env.ELEVENLABS_MODEL || MODELO_PADRAO,
      // Menos estabilidade e mais estilo = locutor mais dramático.
      voice_settings: { stability: 0.35, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true, speed: 1 },
    }),
  });

  if (!resposta.ok) {
    if (resposta.status === 401) return erro(503, 'A chave da ElevenLabs é inválida.');
    if (resposta.status === 429) return erro(429, 'A ElevenLabs está ocupada ou o limite do plano acabou.');
    return erro(502, `Erro da ElevenLabs (${resposta.status}).`);
  }

  // O mesmo trecho gera sempre o mesmo áudio: a Vercel guarda em cache e não
  // gasta créditos de novo se a batalha for narrada outra vez.
  return new Response(resposta.body, {
    headers: {
      ...CORS,
      'content-type': 'audio/mpeg',
      'cache-control': 'public, max-age=86400, s-maxage=2592000',
    },
  });
}
