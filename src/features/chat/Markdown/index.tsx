import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import CodeBlock from './CodeBlock'
import { splitBlocks } from './splitBlocks'
import styles from './index.module.css'

// 插件和组件映射放在组件外面，保证引用稳定，否则 memo 会失效
const remarkPlugins = [remarkGfm]
const rehypePlugins = [rehypeHighlight]
const components: Components = {
  pre: CodeBlock,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
}

// 单个块：内容不变就不重新解析
const MarkdownBlock = memo(({ content }: { content: string }) => (
  <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
    {content}
  </ReactMarkdown>
))

interface Props {
  content: string
}

const Markdown = ({ content }: Props) => {
  const blocks = useMemo(() => splitBlocks(content), [content])

  return (
    <div className={styles.markdown}>
      {/* 块只会在末尾追加、不会插入或删除，所以这里用 index 作 key 是安全的 */}
      {blocks.map((block, index) => (
        <MarkdownBlock key={index} content={block} />
      ))}
    </div>
  )
}

export default Markdown
