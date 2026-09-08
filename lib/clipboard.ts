// navigator.clipboard.writeText는 문서가 포커스를 잃은 순간(다른 탭/창으로 전환,
// 개발자 도구 포커스 등) 호출하면 NotAllowedError로 그냥 던진다. ShareButton/
// ShareCardButton은 클릭 핸들러 안에서 slug를 만드는 API 호출(await)을 먼저
// 하고 나서 복사하는데, 그 사이 틈에 포커스가 빠지면 이 에러가 난다. 이
// 함수는 절대 던지지 않는다 — 실패하면 execCommand('copy')로 한 번 더
// 시도하고(포커스 제약이 덜하다), 그래도 안 되면 false만 돌려줘서 호출부가
// 조용히 실패 상태를 보여줄 수 있게 한다.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 아래 폴백으로 넘어간다.
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
