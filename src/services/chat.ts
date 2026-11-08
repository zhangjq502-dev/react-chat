import { readSSE } from '../../shared/sse.ts'
import type { Role } from '@/types/chat'

interface StreamChatOptions {
  messages: { role: Role; content: string }[]
  signal: AbortSignal
  onDelta: (text: string) => void
}

// 请求后端并逐段回调 AI 回复
// 不用 EventSource：它只支持 GET，没法在请求体里带上对话历史，也没法自定义请求头
export const streamChat = async ({ messages, signal, onDelta }: StreamChatOptions) => {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `请求失败（${res.status}）`)
  }

  for await (const { event, data } of readSSE(res.body)) {
    if (event === 'error') throw new Error(JSON.parse(data).message)
    if (data === '[DONE]') return
    onDelta(JSON.parse(data).delta)
  }

  // 没收到 [DONE] 流就结束了，说明连接中途断了，不能当作正常完成
  throw new Error('连接意外中断')
}
