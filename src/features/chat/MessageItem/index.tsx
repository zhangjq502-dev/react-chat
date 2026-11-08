import { lazy, memo, Suspense, useState } from 'react'
import type { Message } from '@/types/chat'
import styles from './index.module.css'

// Markdown 解析和代码高亮的库很大（约 300KB），懒加载拆成单独的 chunk，
// 首屏不用下载，第一次出现 AI 回复时才加载
const Markdown = lazy(() => import('../Markdown'))

interface Props {
  message: Message
  // 只有最后一条 AI 消息会传这个函数，其他消息不传，memo 才能生效
  onRegenerate?: () => void
}

const MessageItem = ({ message, onRegenerate }: Props) => {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'

  const copy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (isUser) {
    return (
      <div className={`${styles.item} ${styles.user}`}>
        <div className={styles.bubble}>{message.content}</div>
      </div>
    )
  }

  return (
    <div className={styles.item}>
      <div className={styles.assistant}>
        <Suspense fallback={<div className={styles.bubble}>{message.content}</div>}>
          <Markdown content={message.content} />
        </Suspense>
        {isStreaming && <span className={styles.cursor} />}

        {message.status === 'stopped' && <div className={styles.hint}>已停止生成</div>}
        {message.status === 'error' && <div className={styles.error}>出错了：{message.error}</div>}

        {!isStreaming && (
          <div className={styles.actions}>
            {message.content && (
              <button type="button" onClick={copy}>
                {copied ? '已复制' : '复制'}
              </button>
            )}
            {onRegenerate && (
              <button type="button" onClick={onRegenerate}>
                重新生成
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 流式输出时列表每帧都会重新渲染，memo 让内容没变的历史消息直接跳过
export default memo(MessageItem)
