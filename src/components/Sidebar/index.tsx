import { useChatStore } from '@/stores/chat'
import styles from './index.module.css'

const Sidebar = () => {
  const conversations = useChatStore((s) => s.conversations)
  const currentId = useChatStore((s) => s.currentId)
  const newChat = useChatStore((s) => s.newChat)
  const selectConversation = useChatStore((s) => s.selectConversation)
  const deleteConversation = useChatStore((s) => s.deleteConversation)

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`确定删除「${title}」吗？`)) deleteConversation(id)
  }

  return (
    <aside className={styles.sidebar}>
      <button type="button" className={styles.newChat} onClick={newChat}>
        + 新对话
      </button>
      <ul className={styles.list}>
        {conversations.map((c) => (
          <li
            key={c.id}
            className={`${styles.item} ${c.id === currentId ? styles.active : ''}`}
            onClick={() => selectConversation(c.id)}
          >
            <span className={styles.title}>{c.title}</span>
            <button
              type="button"
              className={styles.delete}
              aria-label="删除会话"
              onClick={(e) => {
                e.stopPropagation() // 不触发 li 的点击（选中会话）
                handleDelete(c.id, c.title)
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default Sidebar
