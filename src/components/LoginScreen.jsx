import { useState } from 'react'
import {
  DEFAULT_API_URL,
  enableMessageWebhooks,
  getSettings,
  getStateInstance,
  hasMessageWebhooks
} from '../api/greenApi'

export default function LoginScreen({ onLogin }) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  // Учётные данные верны, но у инстанса выключены вебхуки — без них приём не работает.
  const [needsWebhooks, setNeedsWebhooks] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()

    const credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: apiUrl.trim() || DEFAULT_API_URL
    }

    if (!credentials.idInstance || !credentials.apiTokenInstance) {
      setError('Заполните idInstance и apiTokenInstance')
      return
    }

    setChecking(true)
    setError('')
    setNeedsWebhooks(null)

    try {
      const state = await getStateInstance(credentials)

      if (state?.stateInstance !== 'authorized') {
        setError(`Инстанс не авторизован: ${state?.stateInstance ?? 'неизвестное состояние'}`)
        return
      }

      const settings = await getSettings(credentials)

      if (!hasMessageWebhooks(settings)) {
        setNeedsWebhooks(credentials)
        return
      }

      onLogin(credentials)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setChecking(false)
    }
  }

  async function handleEnableWebhooks() {
    setChecking(true)
    setError('')

    try {
      await enableMessageWebhooks(needsWebhooks)
      onLogin(needsWebhooks)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <h1 className="login__title">Telegram через GREEN-API</h1>
        <p className="login__subtitle">
          Введите учётные данные инстанса из личного кабинета GREEN-API
        </p>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            placeholder="1101000001"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            placeholder="d75b3a66374942c5b3c019c698abc2067e151558acbd412345"
            autoComplete="off"
          />
        </label>

        {showAdvanced ? (
          <label className="field">
            <span className="field__label">Адрес API</span>
            <input
              className="field__input"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder={DEFAULT_API_URL}
              autoComplete="off"
            />
          </label>
        ) : (
          <button type="button" className="login__link" onClick={() => setShowAdvanced(true)}>
            Указать другой адрес API
          </button>
        )}

        {error && <p className="login__error">{error}</p>}

        {needsWebhooks ? (
          <div className="login__notice">
            <p>
              У инстанса выключены вебхуки входящих сообщений — приём работать не будет.
              Включить их сейчас? Инстанс перезагрузится примерно на минуту.
            </p>
            <button
              className="login__submit"
              type="button"
              onClick={handleEnableWebhooks}
              disabled={checking}
            >
              {checking ? 'Включаем…' : 'Включить приём и войти'}
            </button>
          </div>
        ) : (
          <button className="login__submit" type="submit" disabled={checking}>
            {checking ? 'Проверяем…' : 'Войти'}
          </button>
        )}
      </form>
    </div>
  )
}
