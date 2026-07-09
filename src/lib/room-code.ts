// Alfabeto senza caratteri ambigui (niente 0/O/1/I). 32 simboli → 32^6 ≈ 1.07e9.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

// Genera un codice stanza di `length` caratteri maiuscoli non ambigui.
// 256 è multiplo di 32 → nessun bias di modulo.
export function generateRoomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
