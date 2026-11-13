import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings2, X, CheckCircle2, AlertCircle, Loader2, Monitor, Globe, Sparkles, ExternalLink } from 'lucide-react'
import { loadOwnModelSettings, saveOwnModelSettings, configFor, PROVIDER_PRESETS } from '../services/ai/aiSettings'
import type { OwnModelSettings, OwnProviderId, ProviderConfig } from '../services/ai/aiSettings'
import { listModels, describeError } from '../services/ai/aiService'
import './AISettings.css'

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; models: string[] }
  | { status: 'error'; message: string }

const PROVIDER_ORDER: OwnProviderId[] = ['ollama', 'lmstudio', 'openrouter', 'groq', 'gemini-key', 'custom']

/**
 * Gear button + dialog to choose which AI model powers Traddii's agents:
 * Traddii's free Gemini (default) or the user's own model, on their computer or online.
 */
const AISettings = () => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [settings, setSettings] = useState<OwnModelSettings>(loadOwnModelSettings)
  const [test, setTest] = useState<TestState>({ status: 'idle' })

  const active = settings.active
  const preset = active ? PROVIDER_PRESETS[active] : null
  const config = active ? configFor(settings, active) : null

  const persist = (next: OwnModelSettings) => {
    setSettings(next)
    saveOwnModelSettings(next)
  }

  const choose = (id: OwnProviderId | null) => {
    persist({ ...settings, active: id })
    setTest({ status: 'idle' })
  }

  const updateConfig = (patch: Partial<ProviderConfig>) => {
    if (!active || !config) return
    persist({ ...settings, configs: { ...settings.configs, [active]: { ...config, ...patch } } })
  }

  const runTest = async () => {
    if (!active || !config) return
    setTest({ status: 'testing' })
    try {
      const models = await listModels(active, config)
      setTest({ status: 'ok', models })
      if (models.length && !models.includes(config.model)) updateConfig({ model: models[0] })
    } catch (err) {
      setTest({ status: 'error', message: describeError(err) })
    }
  }

  const open = () => {
    setSettings(loadOwnModelSettings())
    setTest({ status: 'idle' })
    dialogRef.current?.showModal()
  }
  const close = () => dialogRef.current?.close()
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://traddii.web.app'

  return (
    <>
      <button type="button" className="ai-settings-btn" onClick={open} aria-label="AI model settings" title="AI model settings">
        <Settings2 size={16} />
      </button>

      {createPortal(
        <dialog
          ref={dialogRef}
          className="ai-settings-dialog"
          aria-labelledby="ai-settings-title"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="ai-settings-body">
            <div className="ai-settings-header">
              <h2 id="ai-settings-title">AI model</h2>
              <button type="button" className="ai-settings-close" onClick={close} aria-label="Close" autoFocus>
                <X size={18} />
              </button>
            </div>

            <fieldset className="ai-provider-list">
              <legend>Which model writes the brief?</legend>

              <label className={`ai-provider ${active === null ? 'selected' : ''}`}>
                <input type="radio" name="ai-provider" checked={active === null} onChange={() => choose(null)} />
                <Sparkles size={16} />
                <span className="ai-provider-text">
                  <strong>Traddii Gemini</strong>
                  <small>Free, nothing to set up. Shared by all users, so it can run out at busy times.</small>
                </span>
              </label>

              {PROVIDER_ORDER.map(id => {
                const p = PROVIDER_PRESETS[id]
                return (
                  <label key={id} className={`ai-provider ${active === id ? 'selected' : ''}`}>
                    <input type="radio" name="ai-provider" checked={active === id} onChange={() => choose(id)} />
                    {p.where === 'computer' ? <Monitor size={16} /> : <Globe size={16} />}
                    <span className="ai-provider-text">
                      <strong>{p.name}</strong>
                      <small>{p.blurb}</small>
                    </span>
                  </label>
                )
              })}
            </fieldset>

            {preset && config && (
              <div className="ai-settings-fields">
                <ol className="ai-setup-steps">
                  {preset.setup.map(step => <li key={step}>{step.replaceAll('{origin}', origin)}</li>)}
                </ol>
                {preset.keyUrl && (
                  <a className="ai-key-link" href={preset.keyUrl} target="_blank" rel="noopener noreferrer">
                    Get a free API key <ExternalLink size={14} />
                  </a>
                )}

                <label>
                  Address
                  <input
                    type="url"
                    value={config.url}
                    onChange={(e) => updateConfig({ url: e.target.value })}
                    placeholder={preset.defaultUrl || 'https://api.example.com/v1'}
                  />
                </label>

                {(preset.needsKey || preset.id === 'custom') && (
                  <label>
                    API key {preset.id === 'custom' && <span className="ai-optional">(if needed)</span>}
                    <input
                      type="password"
                      autoComplete="off"
                      value={config.apiKey}
                      onChange={(e) => updateConfig({ apiKey: e.target.value })}
                      placeholder="Paste your key"
                    />
                  </label>
                )}

                <label>
                  Model
                  {test.status === 'ok' && test.models.length > 0 ? (
                    <select value={config.model} onChange={(e) => updateConfig({ model: e.target.value })}>
                      {test.models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => updateConfig({ model: e.target.value })}
                      placeholder={preset.defaultModel || 'Press Test connection to list models'}
                    />
                  )}
                </label>

                <button type="button" className="ai-settings-test" onClick={runTest} disabled={test.status === 'testing'}>
                  {test.status === 'testing' && <Loader2 size={16} className="mb-spin" />}
                  Test connection
                </button>

                <div aria-live="polite">
                  {test.status === 'ok' && (
                    <p className="ai-settings-result ok">
                      <CheckCircle2 size={16} />
                      {test.models.length
                        ? `Connected - ${test.models.length} model${test.models.length > 1 ? 's' : ''} available.`
                        : 'Connected, but no models were found. Download or load a model first.'}
                    </p>
                  )}
                  {test.status === 'error' && (
                    <p className="ai-settings-result error"><AlertCircle size={16} />{test.message}</p>
                  )}
                </div>

                <p className="ai-settings-note">
                  {preset.where === 'computer'
                    ? 'Requests go straight from this browser to your computer. Works in Chrome, Edge and Firefox (you may be asked to allow local network access); Safari blocks it.'
                    : `Requests go straight from this browser to ${preset.name}. Your key is saved only in this browser - use a free key, and remove it here on shared computers.`}
                  {' '}If your model fails, Traddii falls back to Traddii Gemini.
                </p>
              </div>
            )}
          </div>
        </dialog>,
        document.body
      )}
    </>
  )
}

export default AISettings
