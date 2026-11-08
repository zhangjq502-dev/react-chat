import { useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import styles from './index.module.css'

interface Props {
  isStreaming: boolean
  onSend: (text: string) => void
  onStop: () => void
}

const ChatInput = ({ isStreaming, onSend, onStop }: Props) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 输入框随内容自动变高：先设为 auto 让它收缩，再读 scrollHeight 撑开
  // 用 useLayoutEffect 而不是 useEffect，在浏览器绘制前完成，避免高度闪动
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const canSend = value.trim() !== '' && !isStreaming

  const send = () => {
    if (!canSend) return
    onSend(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 中文输入法选词时按的 Enter 不能触发发送
    // isComposing 覆盖 Chrome；Safari 里 compositionend 先于 keydown 触发，要靠 keyCode 229 判断
    if (e.nativeEvent.isComposing || e.keyCode === 229) return

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault() // 阻止默认的换行
      send()
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.box}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={1}
          placeholder="给 AI 发送消息（Enter 发送，Shift + Enter 换行）"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {isStreaming ? (
          <button type="button" className={styles.send} onClick={onStop}>
            停止
          </button>
        ) : (
          <button type="button" className={styles.send} onClick={send} disabled={!canSend}>
            发送
          </button>
        )}
      </div>
    </div>
  )
}

export default ChatInput
