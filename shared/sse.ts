// SSE（Server-Sent Events）流解析，前后端共用：
// - 后端用它读取大模型接口返回的流
// - 前端用它读取我们自己后端返回的流

export interface SSEEvent {
  event: string
  data: string
}

// 把一个 ReadableStream 解析成一个个 SSE 事件
// 难点：网络分块（chunk）的边界和事件边界无关，一个 chunk 可能包含半个事件，
// 也可能包含好几个事件，所以要用 buffer 拼接，遇到空行才算一个完整事件
export async function* readSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent> {
  const reader = body.getReader()
  // stream: true 让 TextDecoder 保留被截断的多字节字符（中文 3 字节可能被切在两个 chunk 里）
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // 事件之间用空行分隔；最后一段可能不完整，留在 buffer 里等下一个 chunk
      const blocks = buffer.split(/\r?\n\r?\n/)
      buffer = blocks.pop() ?? ''
      for (const block of blocks) {
        const event = parseBlock(block)
        if (event) yield event
      }
    }

    buffer += decoder.decode()
    const last = parseBlock(buffer)
    if (last) yield last
  } finally {
    // 调用方提前 break 或出错时，取消底层流，释放连接
    await reader.cancel().catch(() => {})
  }
}

// 解析一个事件块，例如：
// event: error
// data: {"message":"xxx"}
function parseBlock(block: string): SSEEvent | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of block.split(/\r?\n/)) {
    if (line === '' || line.startsWith(':')) continue // 冒号开头是注释，常用作心跳
    const index = line.indexOf(':')
    const field = index === -1 ? line : line.slice(0, index)
    let value = index === -1 ? '' : line.slice(index + 1)
    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'event') event = value
    else if (field === 'data') dataLines.push(value)
  }

  // 一个事件可以有多行 data，按规范用换行拼接
  return dataLines.length > 0 ? { event, data: dataLines.join('\n') } : null
}
