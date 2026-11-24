/**
 * Logo de BASTO GYM (brand/logo.svg → public/logo.svg): hexágono con una B negra y una G dorada.
 * Es vector, así que queda nítido a cualquier tamaño. Los iconos PNG se regeneran con
 * `node scripts/build-logo.cjs`.
 */
export function LogoMark({ size = 64, className }: { size?: number; className?: string }) {
  return <img src="/logo.svg" width={size} height={size} alt="BASTO GYM" className={className} />
}

export function Logo({ name = 'BASTO GYM', size = 44 }: { name?: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={size} />
      <span className="text-xl font-extrabold leading-none tracking-tight">{name}</span>
    </span>
  )
}
