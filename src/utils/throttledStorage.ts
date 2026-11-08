import type { PersistStorage, StorageValue } from 'zustand/middleware'

// zustand persist 默认每次 set 都会 JSON.stringify 整个状态并写入 localStorage
// 流式输出时每帧都在更新，频繁序列化所有会话会卡顿，所以改为节流写入：
// 最多每 interval 毫秒写一次，页面关闭前再补写一次
export const createThrottledStorage = <T>(interval: number): PersistStorage<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { name: string; value: StorageValue<T> } | null = null

  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    if (!pending) return
    try {
      localStorage.setItem(pending.name, JSON.stringify(pending.value))
    } catch {
      // 存储空间满或浏览器禁用存储时忽略，不影响使用
    }
    pending = null
  }

  window.addEventListener('pagehide', flush)

  return {
    getItem: (name) => {
      try {
        const raw = localStorage.getItem(name)
        return raw ? (JSON.parse(raw) as StorageValue<T>) : null
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      pending = { name, value }
      if (!timer) timer = setTimeout(flush, interval)
    },
    removeItem: (name) => localStorage.removeItem(name),
  }
}
