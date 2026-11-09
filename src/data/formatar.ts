// Formatos de número usados nas telas, no padrão brasileiro.

// 7.2 → "7,2"
export function formatarPoder(poder: number) {
  return poder.toFixed(1).replace('.', ',');
}

// 0.318 → "32%"
export function formatarChance(chance: number) {
  return `${Math.round(chance * 100)}%`;
}

// Código digitado ou lido no QR: "11", "ani011" ou "ANI-011" viram "ANI-011".
export function normalizarCodigo(texto: string) {
  const limpo = texto.trim().toUpperCase();
  const numero = limpo.match(/(\d{1,3})$/)?.[1];
  return numero ? `ANI-${numero.padStart(3, '0')}` : limpo;
}

// Remove acentos para a busca achar "agua" em "Água", por exemplo.
export function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
