#!/usr/bin/env bash
# Gera a versão web do app e publica na Vercel (projeto all-in-draft, time leonardo).
# Uso: bash scripts/publicar-site.sh   (precisa de `npx vercel login` feito uma vez)
set -euo pipefail

SAIDA="${SAIDA:-$(mktemp -d)/site}"
cd "$(dirname "$0")/.."

npx expo export -p web --output-dir "$SAIDA"
cd "$SAIDA"

# A Vercel ignora pastas chamadas node_modules, e é nelas que o Expo põe as fontes.
if [ -d assets/node_modules ]; then
  mv assets/node_modules assets/vendor
  grep -rl "assets/node_modules/" _expo index.html | xargs sed -i 's#assets/node_modules/#assets/vendor/#g'
fi

# Se o app quebrar antes de aparecer, mostra o erro na tela em vez de uma tela escura.
python - <<'PY'
diagnostico = (
    '<script>window.addEventListener("error",function(e){setTimeout(function(){'
    'var r=document.getElementById("root");if(r&&r.childElementCount===0){'
    'document.body.style.background="#15131C";'
    'document.body.innerHTML="<p style=\'color:#E9E4D8;font:16px sans-serif;padding:24px\'>O app n\\u00e3o abriu. Erro: "'
    '+(e.message||(e.target&&e.target.src)||e)+"</p>"}},1500)},true);</script>'
)
html = open('index.html', encoding='utf-8').read()
if 'O app n' not in html:
    html = html.replace('<head>', '<head>' + diagnostico, 1)
open('index.html', 'w', encoding='utf-8').write(html)
PY

# Toda rota do app cai no index.html (o roteamento é feito no navegador).
printf '{\n  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]\n}\n' > vercel.json

npx --yes vercel@latest link --yes --project all-in-draft --scope leonardo-2f75
# O link cria um .env.local com um token: ele NUNCA pode ir para o site público.
rm -f .env.local .gitignore
npx --yes vercel@latest deploy --prod --yes --scope leonardo-2f75
rm -f .env.local
