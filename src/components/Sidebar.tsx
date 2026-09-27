import { useState } from 'react'
import type { FormEvent } from 'react'
import { avatarLabel } from '../api/greenApi'
import type { Chat, ConnectionStatus } from '../types'

const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  connecting: 'подключение…',
  online: 'на связи',
  error: 'нет связи'
}

interface SidebarProps {
  chats: Chat[]
  activeChatId: string | null
  connection: ConnectionStatus
  connectionError: string
  idInstance: string
  onSelectChat: (chatId: string) => void
  onCreateChat: (phone: string) => void
  onLogout: () => void
}

export default function Sidebar({
  chats,
  activeChatId,
  connection,
  connectionError,
  idInstance,
  onSelectChat,
  onCreateChat,
  onLogout
}: SidebarProps) {
  const [phone, setPhone] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!phone.trim()) return

    onCreateChat(phone)
    setPhone('')
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div>
          <div className="sidebar__title">Чаты</div>
          <div
            className={`sidebar__status sidebar__status--${connection}`}
            title={connectionError}
          >
            {idInstance} · {CONNECTION_LABELS[connection]}
          </div>
        </div>
        <button className="sidebar__logout" type="button" onClick={onLogout} title="Выйти">
          Выйти
        </button>
      </header>

      <form className="new-chat" onSubmit={handleSubmit}>
        <input
          className="new-chat__input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Номер телефона получателя"
          autoComplete="off"
        />
        <button className="new-chat__button" type="submit">
          Создать чат
        </button>
      </form>

      <div className="chat-list">
        {chats.length === 0 && <p className="chat-list__empty">Чатов пока нет</p>}

        {chats.map((chat) => {
          const lastMessage = chat.messages[chat.messages.length - 1]

          return (
            <button
              key={chat.chatId}
              type="button"
              className={`chat-item${chat.chatId === activeChatId ? ' chat-item--active' : ''}`}
              onClick={() => onSelectChat(chat.chatId)}
            >
              <span className="chat-item__avatar">{avatarLabel(chat.title)}</span>
              <span className="chat-item__body">
                <span className="chat-item__title">{chat.title}</span>
                <span className="chat-item__preview">
                  {lastMessage ? lastMessage.text : 'Нет сообщений'}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
