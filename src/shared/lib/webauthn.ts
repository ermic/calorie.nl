// Helpers + config voor WebAuthn (passkey). Centraliseert RP-config en
// challenge-persistence-logica zodat de routes klein blijven.
export const RP_NAME = process.env.RP_NAME ?? 'Calorietje';

export function getRpId(): string {
  const id = process.env.RP_ID;
  if (!id) throw new Error('RP_ID ontbreekt — kan WebAuthn niet uitvoeren');
  return id;
}

export function getRpOrigin(): string {
  const origin = process.env.RP_ORIGIN;
  if (!origin) throw new Error('RP_ORIGIN ontbreekt — kan WebAuthn niet uitvoeren');
  return origin;
}

export const CHALLENGE_TTL_MS = 5 * 60 * 1000;
