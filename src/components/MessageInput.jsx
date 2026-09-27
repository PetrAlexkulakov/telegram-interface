import { useState } from 'react'

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const value = text.trim()
    if (!value) return

    onSend(value)
    setText('')
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      handleSubmit(event)
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        className="composer__input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Написать сообщение…"
        rows={1}
      />
      <button className="composer__send" type="submit" disabled={!text.trim()}>
        Отправить
      </button>
    </form>
  )
}
