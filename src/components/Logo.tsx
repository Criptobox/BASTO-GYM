/** Marca de BASTO GYM: una B atravesada por una barra con discos. Mismo dibujo que public/icon.svg. */
export function LogoMark({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="BASTO GYM" className={className}>
      <rect width="512" height="512" rx="112" fill="#0A0A0A" />
      <g fill="#FFAE00">
        <rect x="44" y="244" width="424" height="24" rx="12" />
        <rect x="64" y="146" width="36" height="220" rx="18" />
        <rect x="110" y="186" width="30" height="140" rx="15" />
        <rect x="412" y="146" width="36" height="220" rx="18" />
        <rect x="372" y="186" width="30" height="140" rx="15" />
      </g>
      <g transform="translate(-12 0)" fill="none" stroke="#FFAE00" strokeWidth="52" strokeLinejoin="round">
        <path d="M196 132 H262 a58 58 0 0 1 0 116 H274 a66 66 0 0 1 0 132 H196 Z M196 248 H262" />
      </g>
    </svg>
  )
}

export function Logo({ name = 'BASTO GYM', size = 44 }: { name?: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={size} />
      <span className="text-xl font-extrabold leading-none tracking-tight">{name}</span>
    </span>
  )
}
