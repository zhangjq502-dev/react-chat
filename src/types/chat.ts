// 消息发送方：用户 或 AI
export type Role = 'user' | 'assistant'

// AI 消息的状态：生成中 / 完成 / 被用户停止 / 出错
export type MessageStatus = 'streaming' | 'done' | 'stopped' | 'error'

// 一条消息
export interface Message {
  id: string
  role: Role
  content: string
  status?: MessageStatus
  error?: string
}

// 一个会话
export interface Conversation {
  id: string
  title: string
  messages: Message[]
  updatedAt: number
}
