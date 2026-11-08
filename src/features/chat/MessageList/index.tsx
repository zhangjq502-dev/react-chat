import { useEffect, useRef, useState } from 'react'
import type { Message } from '@/types/chat'
import MessageItem from '../MessageItem'
import styles from './index.module.css'

interface Props {
  messages: Message[]
  onRegenerate: () => void
}

// 距离底部小于这个值就认为“在底部”
const BOTTOM_THRESHOLD = 40

const MessageList = ({ messages, onRegenerate }: Props) => {
  const listRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  // 是否跟随到底部：用户往上翻看历史时暂停跟随，滚回底部后恢复
  // 用 ref 而不是 state：滚动事件很频繁，它的变化不需要触发渲染
  const stickRef = useRef(true)
  const lastScrollTopRef = useRef(0)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const lastUserId = messages.findLast((m) => m.role === 'user')?.id

  const scrollToBottom = () => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD
    // 往上滚说明用户想看历史，立即停止跟随（即使离底部还不到阈值）；
    // 程序自动滚动只会往下，不会误判
    if (el.scrollTop < lastScrollTopRef.current) stickRef.current = false
    else if (atBottom) stickRef.current = true
    lastScrollTopRef.current = el.scrollTop
    // 没在跟随就显示“回到底部”按钮
    setShowScrollButton(!stickRef.current)
  }

  // 用 ResizeObserver 监听内容高度变化，而不是监听 messages：
  // 流式追加文字、Markdown 懒加载完成、代码高亮都会改变高度，统一在这里处理
  useEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    const observer = new ResizeObserver(() => {
      if (stickRef.current) scrollToBottom()
    })
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  // 用户发送新消息时，无论当前在哪都滚到底部
  useEffect(() => {
    stickRef.current = true
    scrollToBottom()
  }, [lastUserId])

  if (messages.length === 0) {
    return (
      <div className={styles.empty}>
        <h1>有什么可以帮你的？</h1>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div ref={listRef} className={styles.list} onScroll={handleScroll}>
        <div ref={innerRef} className={styles.inner}>
          {messages.map((msg, index) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onRegenerate={index === messages.length - 1 ? onRegenerate : undefined}
            />
          ))}
        </div>
      </div>
      {showScrollButton && (
        <button
          type="button"
          className={styles.scrollButton}
          aria-label="滚动到底部"
          onClick={() => {
            stickRef.current = true
            setShowScrollButton(false)
            scrollToBottom()
          }}
        >
          ↓
        </button>
      )}
    </div>
  )
}

export default MessageList
