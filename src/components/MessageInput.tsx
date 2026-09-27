import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

interface MessageInputProps {
  onSend: (text: string) => void
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Поле растёт под текст — на телефоне иначе видно только одну строку.
  useEffect(() => {
    const node = inputRef.current
    if (!node) return

    node.style.height = 'auto'
    // scrollHeight не включает рамку, а из-за box-sizing: border-box она входит
    // в height — без поправки поле переполняется и показывает полосу прокрутки.
    const borders = node.offsetHeight - node.clientHeight
    node.style.height = `${node.scrollHeight + borders}px`
  }, [text])

  function handleSubmit(event: FormEvent | KeyboardEvent) {
    event.preventDefault()

    const value = text.trim()
    if (!value) return

    onSend(value)
    setText('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      handleSubmit(event)
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        ref={inputRef}
        className="composer__input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Написать сообщение…"
        rows={1}
      />
      <button
        className="composer__send"
        type="submit"
        disabled={!text.trim()}
        aria-label="Отправить"
      >
        <span className="composer__send-label">Отправить</span>
        <svg
          className="composer__send-icon"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
        >
          <path d="M3 20.5l18-8.5L3 3.5V10l12 2-12 2v6.5z" fill="currentColor" />
        </svg>
      </button>
    </form>
  )
}
