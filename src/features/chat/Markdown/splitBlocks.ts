// 把 Markdown 按“块”切开：空行分隔段落、列表、表格等，但代码块内部的空行不能切
// 流式输出时只有最后一块在变化，前面的块内容不变，配合 memo 可以跳过重新解析
export const splitBlocks = (text: string): string[] => {
  const blocks: string[] = []
  let current: string[] = []
  // 当前所在代码块的围栏（``` 或 ~~~），null 表示不在代码块里
  let fence: string | null = null

  for (const line of text.split('\n')) {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (match) {
      const marker = match[1]
      if (fence === null) {
        fence = marker
      } else if (marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) {
        fence = null
      }
    }

    if (fence === null && line.trim() === '') {
      if (current.length > 0) {
        blocks.push(current.join('\n'))
        current = []
      }
      continue
    }
    current.push(line)
  }

  if (current.length > 0) blocks.push(current.join('\n'))
  return blocks
}
