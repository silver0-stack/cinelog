// 좌석의 공간 배치를 계산한다. 뒤 열일수록 화면(스크린)에 가깝고, 앞 열일수록
// 사용자(카메라/입구)에 가깝게 3D 좌표(x, y, z)를 만든다.
//
// 좌석 간 간격과 열의 크기는 여기서 인위적으로 줄이지 않는다 — 실제 물리적 간격을
// 그대로 두고, 크기/간격이 좁아 보이는 원근 효과는 CSS perspective가 translateZ를
// 통해 자연스럽게 계산하도록 맡긴다. 여기서 한 번 더 축소하면 이중 축소가 되어
// 뒷열이 기계적으로 눌려 보인다.

export type Seat = {
  id: string
  row: number
  col: number
  x: number
  y: number
  z: number
  /** 0 = 가장 가까운 열, 1 = 가장 먼 열 (화면 쪽) */
  depth: number
}

const ROW_SEAT_COUNTS = [6, 5, 5, 4]

// 열 간 깊이 차이(ROW_GAP_Z)는 일부러 크게 유지한다. 한때 이 값을 줄여서
// "화면 쪽 열이 안 눌린다"는 문제를 해결하려 한 적이 있는데, 그러면 공간이
// 납작해 보여서 오히려 나빠졌다(사용자 피드백: "아까가 훨 좋았는데"). 진짜
// 원인은 깊이가 아니라, 마우스로 다가가는 도중 좌석에 커서가 닿으면 카메라가
// 계속 움직여서 클릭이 빗나가는 것이었고, 그건 CinemaScene의 hover-lock으로
// 해결했다. 즉 깊이감은 그대로 두고 상호작용 쪽을 고쳐야 하는 문제였다.
const ROW_GAP_Z = 190
const ROW_GAP_Y = 58
const BASE_Z = 260
const SEAT_GAP_X = 132
const ARC_STRENGTH = 18

// 완벽하게 정렬된 격자처럼 보이지 않도록 아주 약간의 불규칙함을 더한다.
// 매 렌더마다 흔들리지 않게 시드 고정 난수를 사용한다.
function seededJitter(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export function buildSeatLayout(): Seat[] {
  const seats: Seat[] = []
  const rowCount = ROW_SEAT_COUNTS.length

  ROW_SEAT_COUNTS.forEach((count, row) => {
    const depth = row / (rowCount - 1)
    const z = BASE_Z - row * ROW_GAP_Z
    const y = -row * ROW_GAP_Y

    for (let col = 0; col < count; col++) {
      const centerOffset = col - (count - 1) / 2
      const normalized = centerOffset / (count / 2)
      const arc = normalized * normalized * ARC_STRENGTH

      const seed = row * 11 + col * 7
      const jitterX = (seededJitter(seed) - 0.5) * 9
      const jitterY = (seededJitter(seed + 3.1) - 0.5) * 5
      const jitterZ = (seededJitter(seed + 6.4) - 0.5) * 10

      seats.push({
        id: `${String.fromCharCode(65 + row)}${col + 1}`,
        row,
        col,
        x: centerOffset * SEAT_GAP_X + jitterX,
        y: y + arc + jitterY,
        z: z + jitterZ,
        depth,
      })
    }
  })

  return seats
}
