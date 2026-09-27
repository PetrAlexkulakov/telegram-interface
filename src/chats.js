/**
 * Чистые операции над списком чатов.
 *
 * Telegram отдаёт chatId неоднородно: чат можно создать по номеру телефона
 * (381631775854@c.us), а вебхуки того же диалога приходят уже с числовым
 * идентификатором Telegram (804731243, у групп — отрицательный). Поэтому
 * локальный чат приходится склеивать с каноническим по idMessage.
 */

/** Сообщения двух чатов без дублей по id, в хронологическом порядке. */
function mergeMessages(first, second) {
  const seen = new Set()
  const messages = []

  for (const message of [...first, ...second]) {
    if (seen.has(message.id)) continue
    seen.add(message.id)
    messages.push(message)
  }

  return messages.sort((left, right) => left.timestamp - right.timestamp)
}

/** Добавляет сообщение, создавая чат при необходимости. Дубли по id отбрасываются. */
export function addMessage(chats, chatId, message, title) {
  const existing = chats.find((chat) => chat.chatId === chatId)

  if (!existing) {
    return [{ chatId, title: title || chatId, messages: [message] }, ...chats]
  }

  if (existing.messages.some((item) => item.id === message.id)) {
    return title && title !== existing.title
      ? chats.map((chat) => (chat.chatId === chatId ? { ...chat, title } : chat))
      : chats
  }

  const updated = {
    ...existing,
    title: title || existing.title,
    messages: [...existing.messages, message]
  }

  return [updated, ...chats.filter((chat) => chat.chatId !== chatId)]
}

/** Точечно меняет поля сообщения. */
export function updateMessage(chats, chatId, messageId, patch) {
  return chats.map((chat) =>
    chat.chatId === chatId
      ? {
          ...chat,
          messages: chat.messages.map((message) =>
            message.id === messageId ? { ...message, ...patch } : message
          )
        }
      : chat
  )
}

/** Переносит сообщения локального чата в чат с каноническим chatId. */
export function mergeChats(chats, sourceChatId, targetChatId, title) {
  if (sourceChatId === targetChatId) return chats

  const source = chats.find((chat) => chat.chatId === sourceChatId)
  if (!source) return chats

  const target = chats.find((chat) => chat.chatId === targetChatId)

  const merged = {
    chatId: targetChatId,
    title: title || target?.title || source.title,
    messages: mergeMessages(target?.messages ?? [], source.messages)
  }

  const rest = chats.filter(
    (chat) => chat.chatId !== sourceChatId && chat.chatId !== targetChatId
  )

  return [merged, ...rest]
}

/** Чат, в котором уже лежит сообщение с таким id (кроме исключённого). */
export function findChatByMessageId(chats, messageId, exceptChatId) {
  return chats.find(
    (chat) => chat.chatId !== exceptChatId && chat.messages.some((m) => m.id === messageId)
  )
}
