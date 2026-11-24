/** La clave es siempre de 4 números. */
export const PIN_LENGTH = 4
export const PIN_RE = /^\d{4}$/
export const isValidPin = (p: string) => PIN_RE.test(p)

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')

export const randomSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)))

/** PBKDF2-SHA256: la clave nunca se guarda en claro. Requiere contexto seguro (https o localhost). */
export async function hashPin(pin: string, salt: string): Promise<string> {
  if (!crypto.subtle) throw new Error('Este navegador necesita HTTPS para proteger las claves.')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', iterations: 120_000, salt: new TextEncoder().encode(salt) },
    key, 256,
  )
  return hex(bits)
}

/** Comparación en tiempo constante. */
export async function verifyPin(pin: string, salt: string, expected: string): Promise<boolean> {
  const got = await hashPin(pin, salt)
  if (got.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

// ---- Bloqueo por intentos fallidos ----
export const FREE_ATTEMPTS = 5
export interface LockState { fails: number; until: number } // until: epoch ms

/** Desde el 5.º fallo seguido: 30 s, y se duplica con cada fallo más (máx. 10 min). */
export function failLock(prev: LockState, now: number): LockState {
  const fails = prev.fails + 1
  if (fails < FREE_ATTEMPTS) return { fails, until: 0 }
  const wait = Math.min(30_000 * 2 ** (fails - FREE_ATTEMPTS), 600_000)
  return { fails, until: now + wait }
}
export const attemptsLeft = (s: LockState) => Math.max(0, FREE_ATTEMPTS - s.fails)
export const secondsLeft = (s: LockState, now: number) => Math.max(0, Math.ceil((s.until - now) / 1000))
