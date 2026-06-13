/**
 * DailySeed — o Desafio Diário (docs/04 Fase 3): todos recebem o MESMO cenário
 * no mesmo dia. A seed deriva da data UTC, então é idêntica em qualquer fuso/
 * dispositivo. Determinístico e puro.
 */

/** Chave do dia em UTC: 'YYYY-MM-DD'. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Seed (uint32) derivada da chave do dia via FNV-1a de 32 bits. */
export function dailySeed(date: Date): number {
  const key = dayKey(date);
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
