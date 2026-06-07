import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { getConfig, saveConfig } from './lib/storage'
import './options.css'

export function Options() {
  const [apiKey, setApiKey] = useState('')
  const [apiBaseUrl, setApiBaseUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    getConfig().then((config) => {
      setApiKey(config.apiKey)
      setApiBaseUrl(config.apiBaseUrl)
    })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    try {
      await saveConfig({ apiKey: apiKey.trim(), apiBaseUrl: apiBaseUrl.trim() })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="options-shell">
      <header className="options-header">
        <div className="brand">
          <div className="brand-mark">MFV</div>
          <div className="brand-copy">
            <div className="brand-name">MyFormsVault</div>
            <div className="brand-sub">Extension settings</div>
          </div>
        </div>
      </header>

      <form onSubmit={save} className="options-form">
        <div className="field-group">
          <label htmlFor="apiKey">API key</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="mfv_..."
            autoComplete="off"
            spellCheck={false}
          />
          <p className="field-hint">
            Generate one from your MyFormsVault dashboard under Developers.
          </p>
        </div>

        <div className="field-group">
          <label htmlFor="apiBaseUrl">API base URL</label>
          <input
            id="apiBaseUrl"
            type="url"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="https://your-project.supabase.co/functions/v1/api-vault"
            spellCheck={false}
          />
          <p className="field-hint">
            The Supabase Edge Function URL for your MyFormsVault project.
          </p>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Save settings
          </button>
          {status === 'saved' && <span className="save-status success">Saved.</span>}
          {status === 'error' && <span className="save-status error">Failed to save.</span>}
        </div>
      </form>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Options />)
