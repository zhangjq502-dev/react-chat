import type { ChatMessage } from './types.ts'

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })

const buildReply = (question: string) => `这是 **Mock 回复**（没有配置 \`LLM_API_KEY\`，所以由本地模拟流式输出）。

你刚才问的是：

> ${question.replace(/\n/g, '\n> ')}

下面是一些用来测试渲染效果的内容。

## 代码块

\`\`\`tsx
const Counter = () => {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
\`\`\`

## 列表与表格

1. 流式输出：逐字显示
2. 停止生成：AbortController
3. Markdown 渲染：react-markdown

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| SSE | 简单，基于 HTTP | 单向 |
| WebSocket | 双向 | 需要维护连接 |

配置好 \`.env\` 里的 API Key 后，就会调用真实的大模型。`

// 模拟大模型：每次吐出 1～4 个字符，间隔 20ms
export async function* mockCompletion(
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<string> {
  const question = messages.findLast((m) => m.role === 'user')?.content ?? ''
  const reply = buildReply(question)

  let i = 0
  while (i < reply.length) {
    await sleep(20, signal)
    const size = 1 + Math.floor(Math.random() * 4)
    yield reply.slice(i, i + size)
    i += size
  }
}
