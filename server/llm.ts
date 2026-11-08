import { readSSE } from '../shared/sse.ts'
import type { ChatMessage } from './types.ts'

// OpenAI 兼容接口：DeepSeek、通义千问、Kimi 等都支持，换模型只需改环境变量
const BASE_URL = process.env.LLM_BASE_URL ?? 'https://api.deepseek.com'
const MODEL = process.env.LLM_MODEL ?? 'deepseek-chat'

// 调用大模型并逐段产出回复内容
export async function* streamCompletion(
  apiKey: string,
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, messages, stream: true }),
    // 用户点了停止 → 前端断开 → 这里取消上游请求，不再继续消耗 token
    signal,
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`模型接口错误 ${res.status}：${text.slice(0, 200)}`)
  }

  for await (const { data } of readSSE(res.body)) {
    if (data === '[DONE]') return
    const json = JSON.parse(data)
    const delta: string | undefined = json.choices?.[0]?.delta?.content
    if (delta) yield delta
  }
}
