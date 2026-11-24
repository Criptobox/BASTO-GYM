import type { Worker } from '../lib/types'

/**
 * Modo demostración: solo existe en la compilación `--mode artifact` (la versión navegable que se
 * publica para revisar la app). Trae al administrador y a dos trabajadores ya creados, con claves
 * públicas, para entrar sin configurar nada. La compilación normal no incluye nada de esto.
 */
export const DEMO = import.meta.env.MODE === 'artifact'

export const DEMO_LOGINS = [
  { name: 'Administrador', pin: '9999' },
  { name: 'Daniela', pin: '1111' },
  { name: 'Jorge', pin: '2222' },
]

export const demoWorkers = (): Worker[] => [
  {
    "id": "w-admin",
    "name": "Administrador",
    "role": "admin",
    "active": true,
    "salt": "5d1a7c0e44b9f3a2c8e61b07d93f4a15",
    "pinHash": "4abb1b0a2a335a8d28c1010ba6fd6fbb205b7562775d8f8fd65879e5a58c8dca"
  },
  {
    "id": "w-daniela",
    "name": "Daniela",
    "role": "worker",
    "active": true,
    "salt": "a3f09b6c71d2e84f5b0c9a3e6d17f258",
    "pinHash": "535e06aa38aa5d16b0828e04e39903c3734180268dff308fcb7d7d8090ac9c4f"
  },
  {
    "id": "w-jorge",
    "name": "Jorge",
    "role": "worker",
    "active": true,
    "salt": "c7e2150d8f4a9b36e1d07c52a8b3f946",
    "pinHash": "8705c06a4998ac7edba5ede177cb03257a80c834a9db1120ded3e6b489557747"
  }
]
