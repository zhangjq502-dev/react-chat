import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { streamSSE } from 'hono/streaming'
import { streamCompletion } from './llm.ts'
import { mockCompletion } from './mock.ts'
import type { ChatMessage } from './types.ts'

const PORT = Number(process.env.PORT ?? 3001)
// API Key 只存在于服务端环境变量里，永远不会发到浏览器
const API_KEY = process.env.LLM_API_KEY

const app = new Hono()

app.use('/api/chat', bodyLimit({ maxSize: 1024 * 1024 }))
app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.post('/api/chat', async (c) => {
  const body = await c.req.json<{ messages?: ChatMessage[] }>().catch(() => null)
  const messages = body?.messages
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 200 || !messages.every((m) => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 50000)) {
    return c.json({ message: '消息格式不正确或超出长度限制' }, 400)
  }

  return streamSSE(c, async (stream) => {
    // 浏览器断开（用户点了停止 / 关闭页面）时，取消正在进行的模型请求
    const controller = new AbortController()
    stream.onAbort(() => controller.abort())

    try {
      const source = API_KEY
        ? streamCompletion(API_KEY, messages, controller.signal)
        : mockCompletion(messages, controller.signal)

      for await (const delta of source) {
        await stream.writeSSE({ data: JSON.stringify({ delta }) })
      }
      await stream.writeSSE({ data: '[DONE]' })
    } catch {
      if (controller.signal.aborted) {
        console.log('[chat] 客户端已断开，停止生成')
        return
      }
      const message = '生成失败，请稍后重试或检查服务端配置'
      console.error('[chat]', message)
      await stream.writeSSE({ event: 'error', data: JSON.stringify({ message }) })
    }
  })
})

serve({ fetch: app.fetch, hostname: '127.0.0.1', port: PORT }, (info) => {
  console.log(`API 服务已启动：http://localhost:${info.port}（${API_KEY ? '真实模型' : 'Mock 模式'}）`)
})
