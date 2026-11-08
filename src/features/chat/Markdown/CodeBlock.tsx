import { isValidElement, useRef, useState } from 'react'
import type { ComponentProps, ReactElement } from 'react'
import styles from './index.module.css'

// 替换 react-markdown 默认的 <pre>：加上语言标签和复制按钮
const CodeBlock = ({ children }: ComponentProps<'pre'>) => {
  const preRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)

  // children 是 <code className="hljs language-tsx">，从 className 里取语言
  const className = isValidElement(children)
    ? ((children as ReactElement<{ className?: string }>).props.className ?? '')
    : ''
  const language = className.match(/language-(\S+)/)?.[1] ?? 'text'

  const copy = async () => {
    // 高亮后代码被拆成了很多 span，直接取渲染后的纯文本最简单
    await navigator.clipboard.writeText(preRef.current?.innerText ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span>{language}</span>
        <button type="button" onClick={copy}>
          {copied ? '已复制' : '复制代码'}
        </button>
      </div>
      <pre ref={preRef}>{children}</pre>
    </div>
  )
}

export default CodeBlock
