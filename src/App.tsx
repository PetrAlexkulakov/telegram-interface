import { useCallback, useEffect, useRef, useState } from 'react'
import LoginScreen from './components/LoginScreen'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import { useNotifications } from './hooks/useNotifications'
import { extractText, formatChatId, sendMessage, toChatId } from './api/greenApi'
import { addMessage, findChatByMessageId, mergeChats, updateMessage } from './chats'
import type { Chat, Credentials, Message, NotificationBody } from './types'

const STORAGE_KEY = 'green-api-credentials'

function loadCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Credentials) : null
  } catch {
    return null
  }
}

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  // chatId, по которому чат создали вручную → канонический chatId из вебхука.
  const aliasesRef = useRef(new Map<string, string>())
  // idMessage → chatId, в который отправляли. Нужен, чтобы опознать свой же вебхук.
  const sentToRef = useRef(new Map<string, string>())

  useEffect(() => {
    if (credentials) localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
    else localStorage.removeItem(STORAGE_KEY)
  }, [credentials])

  /** Локальный chatId → тот, под которым чат живёт сейчас. */
  const resolveChatId = useCallback((chatId: string | null): string => {
    const seen = new Set<string>()
    let current = chatId ?? ''

    while (current && aliasesRef.current.has(current) && !seen.has(current)) {
      seen.add(current)
      current = aliasesRef.current.get(current) as string
    }

    return current
  }, [])

  const handleNotification = useCallback(
    (body: NotificationBody) => {
      if (!body) return

      const { typeWebhook: type, idMessage } = body
      if (!idMessage) return

      if (type === 'outgoingMessageStatus') {
        if (body.chatId && body.status) {
          const status = body.status
          setChats((previous) =>
            updateMessage(previous, resolveChatId(body.chatId as string), idMessage, { status })
          )
        }
        return
      }

      const isIncoming = type === 'incomingMessageReceived'
      const isOutgoing = type === 'outgoingMessageReceived' || type === 'outgoingAPIMessageReceived'
      if (!isIncoming && !isOutgoing) return

      const text = extractText(body.messageData)
      if (text === null) return

      const { chatId, chatName, senderName, chatType } = body.senderData ?? {}
      if (!chatId) return

      const isGroup = Boolean(chatType && chatType !== 'user')
      const title = chatName || senderName || formatChatId(chatId)

      const message: Message = {
        id: idMessage,
        text,
        outgoing: isOutgoing,
        author: isIncoming && isGroup ? senderName : undefined,
        timestamp: (body.timestamp ?? Date.now() / 1000) * 1000,
        status: isOutgoing ? 'sent' : undefined
      }

      // Свой же вебхук пришёл с каноническим chatId — склеиваем с локальным чатом.
      const sentTo = sentToRef.current.get(idMessage)
      if (sentTo && sentTo !== chatId) aliasesRef.current.set(sentTo, chatId)

      setChats((previous) => {
        const merged = sentTo ? mergeChats(previous, sentTo, chatId, title) : previous
        return addMessage(merged, chatId, message, title)
      })
    },
    [resolveChatId]
  )

  const connection = useNotifications(credentials, handleNotification)

  function handleCreateChat(phone: string) {
    const chatId = resolveChatId(toChatId(phone))
    if (!chatId) return

    setChats((previous) =>
      previous.some((chat) => chat.chatId === chatId)
        ? previous
        : [{ chatId, title: formatChatId(chatId), messages: [] }, ...previous]
    )
    setSelectedChatId(chatId)
  }

  async function handleSend(text: string) {
    if (!credentials) return

    const chatId = resolveChatId(selectedChatId)
    const localId = `local-${Date.now()}`

    setChats((previous) =>
      addMessage(previous, chatId, {
        id: localId,
        text,
        outgoing: true,
        timestamp: Date.now(),
        status: 'sending'
      })
    )

    let idMessage: string | undefined
    try {
      const response = await sendMessage(credentials, chatId, text)
      idMessage = response?.idMessage
    } catch (error) {
      const description = error instanceof Error ? error.message : String(error)
      setChats((previous) =>
        updateMessage(previous, chatId, localId, { status: 'error', error: description })
      )
      return
    }

    if (idMessage) sentToRef.current.set(idMessage, chatId)

    setChats((previous) => {
      const withRealId = updateMessage(previous, chatId, localId, {
        id: idMessage ?? localId,
        status: 'sent'
      })

      // Вебхук мог обогнать ответ и уже создать чат с каноническим chatId.
      const canonical = idMessage && findChatByMessageId(withRealId, idMessage, chatId)
      if (!canonical) return withRealId

      aliasesRef.current.set(chatId, canonical.chatId)
      return mergeChats(withRealId, chatId, canonical.chatId)
    })
  }

  function handleLogout() {
    setCredentials(null)
    setChats([])
    setSelectedChatId(null)
    aliasesRef.current.clear()
    sentToRef.current.clear()
  }

  if (!credentials) {
    return <LoginScreen onLogin={setCredentials} />
  }

  const activeChatId = resolveChatId(selectedChatId)
  const activeChat = chats.find((chat) => chat.chatId === activeChatId) ?? null

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        connection={connection.status}
        connectionError={connection.error}
        idInstance={credentials.idInstance}
        onSelectChat={setSelectedChatId}
        onCreateChat={handleCreateChat}
        onLogout={handleLogout}
      />
      <ChatWindow chat={activeChat} onSend={handleSend} />
    </div>
  )
}
