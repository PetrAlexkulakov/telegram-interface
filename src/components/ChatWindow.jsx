import { useEffect, useRef } from 'react'
import { avatarLabel } from '../api/greenApi'
import MessageInput from './MessageInput'

const STATUS_LABELS = {
  sending: 'отправляется',
  sent: 'отправлено',
  delivered: 'доставлено',
  read: 'прочитано',
  error: 'ошибка'
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ChatWindow({ chat, onSend }) {
  const messagesRef = useRef(null)

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
