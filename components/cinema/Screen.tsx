type Props = {
  dimmed: boolean
}

export function Screen({ dimmed }: Props) {
  return (
    <div
      className="absolute"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate3d(0px, -430px, -700px) translate(-50%, -50%)',
      }}
    >
      <div
        style={{
          width: 640,
          height: 220,
          background: 'linear-gradient(to bottom, rgba(232,236,246,0.055), rgba(232,236,246,0.015))',
          boxShadow: '0 0 160px 50px rgba(220,226,240,0.05)',
          opacity: dimmed ? 0.3 : 1,
          transition: 'opacity 1.4s ease',
        }}
      />
    </div>
  )
}
