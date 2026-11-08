import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Conversation, Message } from '@/types/chat'
import { streamChat } from '@/services/chat'
import { createThrottledStorage } from '@/utils/throttledStorage'

interface ChatState {
  conversations: Conversation[] // 按最近更新时间排序，最新的在前
  currentId: string | null // null 表示“新对话”页面，发送第一条消息时才真正创建会话

  newChat: () => void
  selectConversation: (id: string) => void
  deleteConversation: (id: string) => void
  send: (text: string) => void
  stop: () => void
  regenerate: () => void
}

type PersistedState = Pick<ChatState, 'conversations' | 'currentId'>

// 每个会话一个 AbortController，不可序列化，不放进 store
// 不同会话可以同时生成，切换会话不会中断其他会话的生成
const controllers = new Map<string, AbortController>()

const isGenerating = (conversation?: Conversation) => conversation?.messages.at(-1)?.status === 'streaming'

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      const updateMessage = (conversationId: string, messageId: string, patch: (m: Message) => Partial<Message>) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch(m) } : m)) }
              : c,
          ),
        }))
      }

      // 基于给定的历史，为某个会话生成一条新的 AI 回复
      // 注意：异步过程中始终用 conversationId 定位会话，而不是 currentId，
      // 因为用户可能在生成过程中切换到别的会话
      const generate = async (conversationId: string, history: Message[]) => {
        const assistantId = crypto.randomUUID()
        const assistant: Message = { id: assistantId, role: 'assistant', content: '', status: 'streaming' }

        // 写入消息，并把会话移到列表最前面
        set((s) => {
          const conversation = s.conversations.find((c) => c.id === conversationId)
          if (!conversation) return s
          const updated = { ...conversation, messages: [...history, assistant], updatedAt: Date.now() }
          return { conversations: [updated, ...s.conversations.filter((c) => c.id !== conversationId)] }
        })

        const controller = new AbortController()
        controllers.set(conversationId, controller)

        // 合并更新：每一帧最多更新一次 store
        let pending = ''
        let frame = 0
        const flush = () => {
          frame = 0
          if (!pending) return
          const text = pending
          pending = ''
          updateMessage(conversationId, assistantId, (m) => ({ content: m.content + text }))
        }

        try {
          await streamChat({
            messages: history
              .filter((m) => m.content && m.status !== 'error')
              .map(({ role, content }) => ({ role, content })),
            signal: controller.signal,
            onDelta: (text) => {
              pending += text
              if (!frame) frame = requestAnimationFrame(flush)
            },
          })
          cancelAnimationFrame(frame)
          flush()
          updateMessage(conversationId, assistantId, () => ({ status: 'done' }))
        } catch (err) {
          cancelAnimationFrame(frame)
          flush()
          if (controller.signal.aborted) {
            updateMessage(conversationId, assistantId, () => ({ status: 'stopped' }))
          } else {
            const error = err instanceof Error ? err.message : '未知错误'
            updateMessage(conversationId, assistantId, () => ({ status: 'error', error }))
          }
        } finally {
          if (controllers.get(conversationId) === controller) controllers.delete(conversationId)
        }
      }

      return {
        conversations: [],
        currentId: null,

        newChat: () => set({ currentId: null }),

        selectConversation: (id) => set({ currentId: id }),

        deleteConversation: (id) => {
          controllers.get(id)?.abort()
          set((s) => ({
            conversations: s.conversations.filter((c) => c.id !== id),
            currentId: s.currentId === id ? null : s.currentId,
          }))
        },

        send: (text) => {
          const { currentId, conversations } = get()
          let conversation = conversations.find((c) => c.id === currentId)
          if (isGenerating(conversation)) return

          if (!conversation) {
            conversation = {
              id: crypto.randomUUID(),
              title: text.slice(0, 30),
              messages: [],
              updatedAt: Date.now(),
            }
            const created = conversation
            set((s) => ({ conversations: [created, ...s.conversations], currentId: created.id }))
          }

          const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: text }
          generate(conversation.id, [...conversation.messages, userMessage])
        },

        // 中断 fetch → 后端感知到断开 → 后端再取消对模型的请求
        stop: () => {
          const { currentId } = get()
          if (currentId) controllers.get(currentId)?.abort()
        },

        // 去掉最后一条 AI 回复，用同样的历史重新生成
        regenerate: () => {
          const { currentId, conversations } = get()
          const conversation = conversations.find((c) => c.id === currentId)
          if (!conversation || isGenerating(conversation)) return
          const lastUserIndex = conversation.messages.findLastIndex((m) => m.role === 'user')
          if (lastUserIndex === -1) return
          generate(conversation.id, conversation.messages.slice(0, lastUserIndex + 1))
        },
      }
    },
    {
      name: 'react-chat',
      storage: createThrottledStorage<PersistedState>(1000),
      // 只持久化数据，不持久化方法
      partialize: (s): PersistedState => ({ conversations: s.conversations, currentId: s.currentId }),
      // 刷新页面时如果有消息还在生成，请求已经断了，把它标记为“已停止”
      merge: (persisted, current) => {
        const saved = persisted as PersistedState | undefined
        if (!saved) return current
        return {
          ...current,
          currentId: saved.currentId,
          conversations: saved.conversations.map((c) => ({
            ...c,
            messages: c.messages.map((m) => (m.status === 'streaming' ? { ...m, status: 'stopped' } : m)),
          })),
        }
      },
    },
  ),
)

// 选择器：写在 store 外面，组件里复用
const EMPTY: Message[] = []

export const selectCurrentMessages = (s: ChatState) =>
  s.conversations.find((c) => c.id === s.currentId)?.messages ?? EMPTY

export const selectIsGenerating = (s: ChatState) =>
  isGenerating(s.conversations.find((c) => c.id === s.currentId))
