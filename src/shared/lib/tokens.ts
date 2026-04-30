import { createHash, randomBytes } from 'crypto';

// Genereert een random token voor verificatie- of reset-links. Plain
// versie wordt in de mail gestopt; in de DB slaan we alleen de
// sha256-hash op zodat een DB-lek geen actieve tokens prijsgeeft.
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}
