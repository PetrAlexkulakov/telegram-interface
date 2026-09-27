/** Учётные данные инстанса GREEN-API. */
export interface Credentials {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
}

/** 'sending' и 'error' ставит само приложение, остальные приходят из GREEN-API. */
export type MessageStatus =
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'noAccount'
  | 'notInGroup'
  | 'error'

export interface Message {
  id: string
  text: string
  outgoing: boolean
  timestamp: number
  /** Имя отправителя — показывается только во входящих групповых сообщениях. */
  author?: string
  status?: MessageStatus
  error?: string
}

export interface Chat {
  chatId: string
  title: string
  messages: Message[]
}

export type ConnectionStatus = 'connecting' | 'online' | 'error'

export interface Connection {
  status: ConnectionStatus
  error: string
}

/* --- Ответы GREEN-API --- */

export interface StateInstanceResponse {
  stateInstance: string
}

export interface SettingsResponse {
  wid?: string
  typeInstance?: string
  incomingWebhook?: 'yes' | 'no'
  outgoingWebhook?: 'yes' | 'no'
  outgoingMessageWebhook?: 'yes' | 'no'
  outgoingAPIMessageWebhook?: 'yes' | 'no'
}

export interface SendMessageResponse {
  idMessage: string
}

export interface MessageData {
  typeMessage?: string
  textMessageData?: { textMessage?: string }
  extendedTextMessageData?: { text?: string }
}

export interface SenderData {
  chatId?: string
  chatName?: string
  senderName?: string
  /** 'user' у личных чатов, 'group' / 'supergroup' / 'channel' у остальных. */
  chatType?: string
}

/**
 * Тело вебхука. Поля объявлены необязательными намеренно: это данные из сети,
 * состав которых зависит от типа вебхука, поэтому код проверяет их по месту.
 */
export interface NotificationBody {
  typeWebhook?: string
  idMessage?: string
  timestamp?: number
  chatId?: string
  status?: MessageStatus
  senderData?: SenderData
  messageData?: MessageData
}

export interface Notification {
  receiptId: number
  body: NotificationBody
}
