// Accepteert zowel NL-komma als punt als decimal separator. Retourneert
// 0 voor lege/onleesbare input, of een clamp op >= 0. Gebruikt door
// alle numerieke form-inputs zodat gedrag consistent is op mobile
// NL-toetsenborden.
export function parseDecimal(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  if (!normalized) return 0;
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// Variant die '' / negatief / NaN als null terugeeft ipv 0. Handig voor
// optionele number-fields waar 'niet ingevuld' een betekenisvol verschil
// maakt met '0'.
export function parseDecimalOrNull(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim();
  if (!normalized) return null;
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Zod-compatibele check voor een 'optionele numerieke string' input.
// Leeg = OK; anders moet Number.isFinite(parseFloat(norm)) gelden.
export function isValidDecimalString(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === '') return true;
  const n = parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(n) && n >= 0;
}
