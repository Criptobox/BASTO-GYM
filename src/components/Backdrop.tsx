import { LogoMark } from './Logo'

/**
 * Fondo común de la app por dentro, igual al del acceso: fibra de carbono, franja dorada en la esquina
 * y el logo enorme y casi transparente detrás. Es decorativo y no recibe toques.
 */
export function Backdrop() {
  return (
    <>
      <div aria-hidden className="carbon pointer-events-none fixed inset-0" />
      <div aria-hidden className="pointer-events-none fixed -left-4 -top-4 h-24 w-56 opacity-40 [clip-path:polygon(0_0,100%_0,0_100%)] [background:linear-gradient(100deg,var(--color-amber),transparent_75%)]" />
      <div aria-hidden className="pointer-events-none fixed left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 opacity-[0.09] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_22%,#000_78%,transparent_100%)]">
        <LogoMark size={560} state="default" label="" />
      </div>
    </>
  )
}
