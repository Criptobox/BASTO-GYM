// Sustituto de @jsquash/webp en la demo publicada: el visor no puede cargar WASM aparte.
// Solo se usaría en navegadores que no codifican WebP de forma nativa (Safari).
export async function encode(): Promise<ArrayBuffer> {
  throw new Error('El convertidor WebP de respaldo no está disponible en la demo.')
}
