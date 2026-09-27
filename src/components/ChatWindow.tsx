import { useEffect, useRef } from 'react'
import { avatarLabel } from '../api/greenApi'
import MessageInput from './MessageInput'
import type { Chat, MessageStatus } from '../types'

const STATUS_LABELS: Partial<Record<MessageStatus, string>> = {
  sending: 'отправляется',
  sent: 'отправлено',
  delivered: 'доставлено',
  read: 'прочитано',
  error: 'ошибка'
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

interface ChatWindowProps {
  chat: Chat | null
  onSend: (text: string) => void
  /** Возврат к списку чатов — кнопка видна только на узких экранах. */
  onBack: () => void
}

export default function ChatWindow({ chat, onSend, onBack }: ChatWindowProps) {
  const messagesRef = useRef<HTMLDivElement>(null)

  // Скроллим саму ленту, а не страницу — иначе вьюпорт уезжает вместе с сайдбаром.
  useEffect(() => {
    const node = messagesRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [chat?.messages.length, chat?.chatId])

  if (!chat) {
    return (
      <main className="chat chat--empty">
        <p className="chat__placeholder">
          Введите номер телефона слева, чтобы начать переписку
        </p>
      </main>
    )
  }

  return (
    <main className="chat">
      <header className="chat__header">
        <button className="chat__back" type="button" onClick={onBack} aria-label="К списку чатов">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M15 4.5L7.5 12l7.5 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="chat__avatar">{avatarLabel(chat.title)}</span>
        <div>
          <div className="chat__title">{chat.title}</div>
          <div className="chat__subtitle">{chat.chatId}</div>
        </div>
      </header>

      <div className="messages" ref={messagesRef}>
        {chat.messages.length === 0 && (
          <p className="messages__empty">Сообщений пока нет — напишите первым</p>
        )}

        {chat.messages.map((message) => (
          <div
            key={message.id}
            className={`bubble${message.outgoing ? ' bubble--out' : ' bubble--in'}`}
            title={message.error || ''}
          >
            <span className="bubble__content">
              {message.author && <span className="bubble__author">{message.author}</span>}
              <span className="bubble__text">{message.text}</span>
            </span>
            <span className="bubble__meta">
              {formatTime(message.timestamp)}
              {message.outgoing && message.status && (
                <span className={`bubble__status bubble__status--${message.status}`}>
                  {STATUS_LABELS[message.status] ?? message.status}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <MessageInput onSend={onSend} />
    </main>
  )
}
