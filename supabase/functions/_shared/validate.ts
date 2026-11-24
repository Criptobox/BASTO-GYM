// Validaciones puras, compartidas por la función y sus pruebas.
export const MAX_BYTES = 300 * 1024
export const PATH_RE = /^products\/[0-9a-f-]{36}-\d{10,13}\.webp$/

/** Un WebP real empieza con "RIFF" + 4 bytes de tamaño + "WEBP". */
export function isWebP(b: Uint8Array): boolean {
  const s = (o: number, t: string) => [...t].every((c, i) => b[o + i] === c.charCodeAt(0))
  return b.length > 12 && s(0, 'RIFF') && s(8, 'WEBP')
}

export function validatePath(path: unknown): string | null {
  return typeof path === 'string' && PATH_RE.test(path) ? null : 'Ruta de imagen no permitida'
}

export function validateUpload(path: unknown, bytes: Uint8Array): string | null {
  return (
    validatePath(path) ??
    (bytes.length === 0 ? 'Imagen vacía' : null) ??
    (bytes.length > MAX_BYTES ? `La imagen supera ${MAX_BYTES / 1024} KB` : null) ??
    (isWebP(bytes) ? null : 'Solo se aceptan imágenes WebP')
  )
}

export function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
