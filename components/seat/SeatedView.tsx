type Props = {
  seatId: string
}

export function SeatedView({ seatId }: Props) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '28%',
          transform: 'translate(-50%, -50%)',
          width: 'min(70vw, 900px)',
          height: 'min(38vw, 420px)',
          background: 'radial-gradient(ellipse at center, rgba(230,234,244,0.06), rgba(230,234,244,0.01) 70%)',
          filter: 'blur(2px)',
        }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%]"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.5) 60%, transparent)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-[10%] h-[28%] w-[20%] rounded-t-md"
        style={{ background: 'rgba(0,0,0,0.92)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-[10%] h-[28%] w-[20%] rounded-t-md"
        style={{ background: 'rgba(0,0,0,0.92)' }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 38%, rgba(0,0,0,0.72) 100%)' }}
      />

      <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] text-white/25">
        SEAT {seatId}
      </span>
    </div>
  )
}
