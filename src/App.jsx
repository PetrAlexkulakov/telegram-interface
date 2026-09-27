import { useCallback, useEffect, useState } from 'react'
import LoginScreen from './components/LoginScreen'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import { useNotifications } from './hooks/useNotifications'
import { extractText, formatChatId, sendMessage, toChatId } from './api/greenApi'

const STORAGE_KEY = 'green-api-credentials'

function loadCredentials() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  const [credentials, setCredentials] = useState(loadCredentials)
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)

  useEffect(() => {
    if (credentials) localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
    else localStorage.removeItem(STORAGE_KEY)
  }, [credentials])

  /** Добавляет сообщение в чат, создавая чат при необходимости. Дубли по id отбрасываются. */
  const addMessage = useCallback((chatId, message, title) => {
    setChats((previous) => {
      const existing = previous.find((chat) => chat.chatId === chatId)

      if (!existing) {
        return [{ chatId, title: title || formatChatId(chatId), messages: [message] }, ...previous]
      }

      if (existing.messages.some((item) => item.id === message.id)) return previous

      const updated = {
        ...existing,
        title: title || existing.title,
        messages: [...existing.messages, message]
      }
      return [updated, ...previous.filter((chat) => chat.chatId !== chatId)]
    })
  }, [])

  const updateMessage = useCallback((chatId, messageId, patch) => {
    setChats((previous) =>
      previous.map((chat) =>
        chat.chatId === chatId
          ? {
              ...chat,
              messages: chat.messages.map((message) =>
                message.id === messageId ? { ...message, ...patch } : message
              )
            }
          : chat
      )
    )
  }, [])

  const handleNotification = useCallback(
    (body) => {
      if (!body) return

      const { typeWebhook: type } = body

      if (type === 'outgoingMessageStatus') {
        if (body.chatId) updateMessage(body.chatId, body.idMessage, { status: body.status })
        return
      }

      const isIncoming = type === 'incomingMessageReceived'
      const isOutgoing = type === 'outgoingMessageReceived' || type === 'outgoingAPIMessageReceived'
      if (!isIncoming && !isOutgoing) return

      const text = extractText(body.messageData)
      if (text === null) return

      const { chatId, chatName, senderName, chatType } = body.senderData ?? {}
      if (!chatId) return

      const isGroup = chatType && chatType !== 'user'

      addMessage(
        chatId,
        {
          id: body.idMessage,
          text,
          outgoing: isOutgoing,
          author: isIncoming && isGroup ? senderName : undefined,
          timestamp: (body.timestamp ?? Date.now() / 1000) * 1000,
          status: isOutgoing ? 'sent' : undefined
        },
        chatName || (isGroup ? undefined : senderName)
      )
    },
    [addMessage, updateMessage]
  )

  const connection = useNotifications(credentials, handleNotification)

  function handleCreateChat(phone) {
    const chatId = toChatId(phone)
    if (!chatId) return

    setChats((previous) =>
      previous.some((chat) => chat.chatId === chatId)
        ? previous
        : [{ chatId, title: formatChatId(chatId), messages: [] }, ...previous]
    )
    setActiveChatId(chatId)
  }

  async function handleSend(text) {
    const chatId = activeChatId
    const localId = `local-${Date.now()}`

    addMessage(chatId, {
      id: localId,
      text,
      outgoing: true,
      timestamp: Date.now(),
      status: 'sending'
    })

    try {
      const response = await sendMessage(credentials, chatId, text)
      updateMessage(chatId, localId, { id: response?.idMessage ?? localId, status: 'sent' })
    } catch (error) {
      updateMessage(chatId, localId, { status: 'error', error: error.message })
    }
  }

  function handleLogout() {
    setCredentials(null)
    setChats([])
    setActiveChatId(null)
  }

  if (!credentials) {
    return <LoginScreen onLogin={setCredentials} />
  }

  const activeChat = chats.find((chat) => chat.chatId === activeChatId) ?? null

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        connection={connection.status}
        connectionError={connection.error}
        idInstance={credentials.idInstance}
        onSelectChat={setActiveChatId}
        onCreateChat={handleCreateChat}
        onLogout={handleLogout}
      />
      <ChatWindow chat={activeChat} onSend={handleSend} />
    </div>
  )
}
