# React Chat

类 ChatGPT 的 AI 对话应用：流式输出、Markdown 渲染、多会话管理。

技术栈：React 19 · TypeScript · Vite · zustand · CSS Modules · Node（Hono）

## 运行

```bash
npm install
npm run dev
```

`npm run dev` 会同时启动前端（Vite）和后端（Node，端口 3001）。

不配置 API Key 时后端使用 **Mock 模式**，模拟流式输出。要接入真实模型：

```bash
cp .env.example .env
```

然后在 `.env` 中填写 `LLM_API_KEY`。支持任意 OpenAI 兼容接口（DeepSeek、通义千问、Kimi 等），修改 `LLM_BASE_URL` 和 `LLM_MODEL` 即可切换。

## 目录结构

```
server/               Node 后端：转发请求到大模型，隐藏 API Key
shared/sse.ts         前后端共用的 SSE 流解析
src/
  services/chat.ts    请求后端、读取流
  stores/chat.ts      zustand：会话、消息、生成流程
  features/chat/      对话相关组件（消息列表、单条消息、输入框、Markdown）
  components/Sidebar  会话列表
  utils/              节流持久化存储
```

## 安全与验证

使用 Node.js 24+。运行 `npm run lint` 和 `npm run build` 验证。
后端仅监听本机，支持 `/api/health` 健康检查。
密钥仅保存在服务端 `.env`，禁止使用 VITE_ 前缀保存密钥。
公开部署前需增加身份认证和调用配额。
