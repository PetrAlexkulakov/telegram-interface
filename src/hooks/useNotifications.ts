import { useEffect, useRef, useState } from 'react'
import { deleteNotification, receiveNotification } from '../api/greenApi'
import type { Connection, Credentials, NotificationBody } from '../types'

const RETRY_DELAY = 3000

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type NotificationHandler = (body: NotificationBody) => void

/**
 * Бесконечный цикл опроса ReceiveNotification.
 * Каждое полученное уведомление передаётся в onNotification и сразу удаляется
 * методом DeleteNotification, чтобы не пришло повторно.
 */
export function useNotifications(
  credentials: Credentials | null,
  onNotification: NotificationHandler
): Connection {
  const [connection, setConnection] = useState<Connection>({ status: 'connecting', error: '' })
  const callbackRef = useRef<NotificationHandler>(onNotification)
  callbackRef.current = onNotification

  useEffect(() => {
    if (!credentials) return undefined

    let stopped = false
    const controller = new AbortController()

    async function poll(current: Credentials) {
      while (!stopped) {
        try {
          const notification = await receiveNotification(current, controller.signal)
          if (stopped) return

          setConnection({ status: 'online', error: '' })
          if (!notification) continue

          try {
            callbackRef.current?.(notification.body)
          } finally {
            await deleteNotification(current, notification.receiptId, controller.signal)
          }
        } catch (error) {
          if (stopped || (error as Error)?.name === 'AbortError') return
          setConnection({
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          })
          await delay(RETRY_DELAY)
        }
      }
    }

    setConnection({ status: 'connecting', error: '' })
    poll(credentials)

    return () => {
      stopped = true
      controller.abort()
    }
  }, [credentials])

  return connection
}
