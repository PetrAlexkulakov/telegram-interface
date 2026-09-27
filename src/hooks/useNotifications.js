import { useEffect, useRef, useState } from 'react'
import { deleteNotification, receiveNotification } from '../api/greenApi'

const RETRY_DELAY = 3000

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Бесконечный цикл опроса ReceiveNotification.
 * Каждое полученное уведомление передаётся в onNotification и сразу удаляется
 * методом DeleteNotification, чтобы не пришло повторно.
 *
 * @returns {{status: 'connecting'|'online'|'error', error: string}} состояние подключения
 */
export function useNotifications(credentials, onNotification) {
  const [connection, setConnection] = useState({ status: 'connecting', error: '' })
  const callbackRef = useRef(onNotification)
  callbackRef.current = onNotification

  useEffect(() => {
    if (!credentials) return undefined

    let stopped = false
    const controller = new AbortController()

    async function poll() {
      while (!stopped) {
        try {
          const notification = await receiveNotification(credentials, controller.signal)
          if (stopped) return

          setConnection({ status: 'online', error: '' })
          if (!notification) continue

          try {
            callbackRef.current?.(notification.body)
          } finally {
            await deleteNotification(credentials, notification.receiptId, controller.signal)
          }
        } catch (error) {
          if (stopped || error.name === 'AbortError') return
          setConnection({ status: 'error', error: error.message })
          await delay(RETRY_DELAY)
        }
      }
    }

    setConnection({ status: 'connecting', error: '' })
    poll()

    return () => {
      stopped = true
      controller.abort()
    }
  }, [credentials])

  return connection
}
