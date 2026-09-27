/**
 * Тонкая обёртка над HTTP API GREEN-API.
 * Отправка   — метод SendMessage
 * Получение  — методы ReceiveNotification / DeleteNotification (технология HTTP API)
 */

import type {
  Credentials,
  MessageData,
  Notification,
  SendMessageResponse,
  SettingsResponse,
  StateInstanceResponse
} from '../types'

export const DEFAULT_API_URL = 'https://api.green-api.com'

/** Секунды, которые сервер держит открытым запрос ReceiveNotification (long polling). */
const RECEIVE_TIMEOUT = 10

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  /** Статусы, которые означают «данных нет», а не ошибку. */
  emptyStatuses?: number[]
}

function buildUrl(
  { apiUrl, idInstance, apiTokenInstance }: Credentials,
  method: string,
  tail = ''
): string {
  const base = (apiUrl || DEFAULT_API_URL).replace(/\/+$/, '')
  return `${base}/waInstance${idInstance}/${method}/${apiTokenInstance}${tail}`
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T | null> {
  const { method = 'GET', body, signal, emptyStatuses = [] } = options

  const response = await fetch(url, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })

  // Для long polling часть статусов — это не ошибка, а «ничего не пришло».
  if (emptyStatuses.includes(response.status)) return null

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`GREEN-API ${response.status}: ${text || response.statusText}`)
  }

  if (!text) return null

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Не удалось разобрать ответ GREEN-API: ${text}`)
  }
}

/** Состояние инстанса — используется для проверки учётных данных при входе. */
export function getStateInstance(credentials: Credentials, signal?: AbortSignal) {
  return request<StateInstanceResponse>(buildUrl(credentials, 'getStateInstance'), { signal })
}

/** Настройки инстанса — нужны, чтобы проверить, включён ли приём уведомлений. */
export function getSettings(credentials: Credentials, signal?: AbortSignal) {
  return request<SettingsResponse>(buildUrl(credentials, 'getSettings'), { signal })
}

/**
 * Включает вебхуки входящих и исходящих сообщений.
 * Без них ReceiveNotification не вернёт ни одного сообщения.
 * После вызова инстанс перезагружается примерно на минуту.
 */
export function enableMessageWebhooks(credentials: Credentials, signal?: AbortSignal) {
  return request<{ saveSettings: boolean }>(buildUrl(credentials, 'setSettings'), {
    method: 'POST',
    body: {
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
      outgoingAPIMessageWebhook: 'yes'
    },
    signal
  })
}

/** Приём сообщений работает только при включённых вебхуках. */
export function hasMessageWebhooks(settings: SettingsResponse | null): boolean {
  return settings?.incomingWebhook === 'yes' && settings?.outgoingAPIMessageWebhook === 'yes'
}

/** Отправка текстового сообщения: POST /waInstance{id}/sendMessage/{token} */
export function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
  signal?: AbortSignal
) {
  return request<SendMessageResponse>(buildUrl(credentials, 'sendMessage'), {
    method: 'POST',
    body: { chatId, message },
    signal
  })
}

/**
 * Получение входящего уведомления.
 * Возвращает { receiptId, body } либо null, если за время ожидания ничего не пришло.
 * Пустое ожидание GREEN-API отдаёт как 200 с пустым телом либо как 408 —
 * и то и другое означает «сообщений нет», а не обрыв связи.
 */
export function receiveNotification(credentials: Credentials, signal?: AbortSignal) {
  const url = buildUrl(credentials, 'receiveNotification', `?receiveTimeout=${RECEIVE_TIMEOUT}`)
  return request<Notification>(url, { signal, emptyStatuses: [408] })
}

/** Подтверждение обработки уведомления — иначе оно придёт повторно. */
export function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal?: AbortSignal
) {
  return request<{ result: boolean }>(buildUrl(credentials, 'deleteNotification', `/${receiptId}`), {
    method: 'DELETE',
    signal
  })
}

/**
 * Приводит введённый номер телефона к chatId в формате GREEN-API.
 * Можно ввести как номер (+7 900 123-45-67), так и готовый chatId (79001234567@c.us).
 */
export function toChatId(value: string): string {
  const trimmed = value.trim()
  if (trimmed.includes('@')) return trimmed

  const digits = trimmed.replace(/\D/g, '')
  return digits ? `${digits}@c.us` : ''
}

/**
 * Человекочитаемое имя чата.
 * Личные чаты приходят как 79001234567@c.us, групповые — как -1001681300319.
 */
export function formatChatId(chatId: string): string {
  return chatId.endsWith('@c.us') ? `+${chatId.split('@')[0]}` : chatId
}

/** Две буквы для аватара чата. */
export function avatarLabel(title: string): string {
  const clean = title.replace(/^\+/, '').trim()
  return /^\d/.test(clean) ? clean.slice(-2) : clean.slice(0, 2).toUpperCase()
}

/** Достаёт текст из messageData уведомления. null — если сообщение не текстовое. */
export function extractText(messageData: MessageData | undefined): string | null {
  if (!messageData) return null

  switch (messageData.typeMessage) {
    case 'textMessage':
      return messageData.textMessageData?.textMessage ?? null
    case 'extendedTextMessage':
      return messageData.extendedTextMessageData?.text ?? null
    case 'quotedMessage':
      return messageData.extendedTextMessageData?.text ?? null
    default:
      return null
  }
}
