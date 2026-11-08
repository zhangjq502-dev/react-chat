import Sidebar from '@/components/Sidebar'
import MessageList from '@/features/chat/MessageList'
import ChatInput from '@/features/chat/ChatInput'
import { selectCurrentMessages, selectIsGenerating, useChatStore } from '@/stores/chat'
import styles from '@/App.module.css'

const App = () => {
  // 每个选择器只订阅自己需要的数据，数据没变时组件不会重新渲染
  const currentId = useChatStore((s) => s.currentId)
  const messages = useChatStore(selectCurrentMessages)
  const isStreaming = useChatStore(selectIsGenerating)
  const send = useChatStore((s) => s.send)
  const stop = useChatStore((s) => s.stop)
  const regenerate = useChatStore((s) => s.regenerate)

  return (
    <div className={styles.app}>
      <Sidebar />
      <main className={styles.main}>
        {/* 切换会话时用 key 让列表重新挂载，滚动位置等内部状态自动重置 */}
        <MessageList key={currentId ?? 'new'} messages={messages} onRegenerate={regenerate} />
        <ChatInput isStreaming={isStreaming} onSend={send} onStop={stop} />
      </main>
    </div>
  )
}

export default App
