import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'
import type { GenerativeModel } from 'firebase/ai'
import app from '../../config/firebase'
import { loadOwnModelSettings, configFor, PROVIDER_PRESETS } from './aiSettings'
import type { OwnProviderId, ProviderConfig, ProviderPreset } from './aiSettings'

/**
 * One entry point for text generation, tried in this order:
 *   1. The user's own model, if they chose one (Ollama, LM Studio, OpenRouter, Groq, ...)
 *   2. Traddii's Gemini through Firebase AI Logic (free tier, shared quota)
 */

export interface GenerateRequest {
  system: string
  prompt: string
  /** Ask for a JSON object back */
  json?: boolean
  signal?: AbortSignal
}

export interface GenerateResult {
  text: string
  /** Human-readable source, e.g. "Ollama" or "Traddii Gemini" */
  providerName: string
  model: string
}

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.5-flash-lite'
const TIMEOUT_MS = 90_000

/** Reasoning models (Qwen 3, DeepSeek R1...) may wrap their thinking in <think> tags */
const stripThinking = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

const withTimeout = (signal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

const trimUrl = (url: string) => url.trim().replace(/\/+$/, '')

const errorFrom = async (res: Response) => {
  const body = await res.json().catch(() => null)
  const msg = body?.error?.message ?? body?.error ?? body?.message
  return new Error(typeof msg === 'string' ? `${res.status}: ${msg}` : `HTTP ${res.status}`)
}

// ---------- User's own model ----------

const authHeaders = (config: ProviderConfig): Record<string, string> =>
  config.apiKey.trim() ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {}

const generateOllama = async (config: ProviderConfig, req: GenerateRequest) => {
  const res = await fetch(`${trimUrl(config.url)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: withTimeout(req.signal),
    body: JSON.stringify({
      model: config.model,
      stream: false,
      think: false,
      format: req.json ? 'json' : undefined,
      options: { temperature: 0.3 },
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt }
      ]
    })
  })
  if (!res.ok) throw await errorFrom(res)
  const data = await res.json()
  return String(data?.message?.content ?? '')
}

const generateOpenAI = async (config: ProviderConfig, req: GenerateRequest) => {
  // response_format is not sent: support for it varies between services and
  // the caller already parses JSON out of plain text.
  const res = await fetch(`${trimUrl(config.url)}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config) },
    signal: withTimeout(req.signal),
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt }
      ]
    })
  })
  if (!res.ok) throw await errorFrom(res)
  const data = await res.json()
  return String(data?.choices?.[0]?.message?.content ?? '')
}

const generateOwn = async (preset: ProviderPreset, config: ProviderConfig, req: GenerateRequest): Promise<GenerateResult> => {
  if (!config.url.trim()) throw new Error('No address set')
  if (!config.model.trim()) throw new Error('No model chosen - press Test connection in AI settings')
  if (preset.needsKey && !config.apiKey.trim()) throw new Error('No API key set')
  const raw = preset.api === 'ollama' ? await generateOllama(config, req) : await generateOpenAI(config, req)
  const text = stripThinking(raw)
  if (!text) throw new Error('Empty response')
  return { text, providerName: preset.name, model: config.model }
}

/** Checks the connection and returns the models the provider offers */
export const listModels = async (id: OwnProviderId, config: ProviderConfig): Promise<string[]> => {
  const preset = PROVIDER_PRESETS[id]
  const base = trimUrl(config.url)
  if (!base) throw new Error('Enter the address first')
  if (preset.needsKey && !config.apiKey.trim()) throw new Error('Enter your API key first')

  const res = preset.api === 'ollama'
    ? await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(8000) })
    : await fetch(`${base}/models`, { headers: authHeaders(config), signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw await errorFrom(res)
  const data = await res.json()

  const ids: string[] = preset.api === 'ollama'
    ? (data?.models ?? []).map((m: { name: string }) => m.name)
    // Google lists ids as "models/gemini-..."; the chat endpoint wants them without the prefix
    : (data?.data ?? []).map((m: { id: string }) => String(m.id).replace(/^models\//, ''))

  return ids.filter(m => (preset.modelFilter ? preset.modelFilter(m) : true)).sort()
}

// ---------- Traddii's Gemini via Firebase AI Logic ----------

const geminiModels = new Map<string, GenerativeModel>()

const getGemini = (system: string, json: boolean) => {
  const key = `${json}:${system}`
  let model = geminiModels.get(key)
  if (!model) {
    const ai = getAI(app, { backend: new GoogleAIBackend() })
    model = getGenerativeModel(ai, {
      model: GEMINI_MODEL,
      systemInstruction: system,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1200,
        ...(json ? { responseMimeType: 'application/json' } : {})
      }
    })
    geminiModels.set(key, model)
  }
  return model
}

const generateGemini = async (req: GenerateRequest): Promise<GenerateResult> => {
  const model = getGemini(req.system, !!req.json)
  const result = await model.generateContent(req.prompt, { signal: withTimeout(req.signal) })
  const text = stripThinking(result.response.text())
  if (!text) throw new Error('Empty response')
  return { text, providerName: 'Traddii Gemini', model: GEMINI_MODEL }
}

// ---------- Chain ----------

export class AIUnavailableError extends Error {}

export const generate = async (req: GenerateRequest): Promise<GenerateResult> => {
  const settings = loadOwnModelSettings()
  const steps: { name: string; run: () => Promise<GenerateResult> }[] = []
  if (settings.active) {
    const preset = PROVIDER_PRESETS[settings.active]
    const config = configFor(settings, settings.active)
    steps.push({ name: preset.name, run: () => generateOwn(preset, config, req) })
  }
  steps.push({ name: 'Traddii Gemini', run: () => generateGemini(req) })

  const failures: string[] = []
  for (const step of steps) {
    if (req.signal?.aborted) break
    try {
      return await step.run()
    } catch (err) {
      if (req.signal?.aborted) break
      failures.push(`${step.name}: ${describeError(err)}`)
    }
  }
  throw new AIUnavailableError(failures.join(' · ') || 'No AI model available')
}

export const describeError = (err: unknown): string => {
  const msg = err instanceof Error ? err.message : String(err)
  if (/app ?check/i.test(msg)) return 'this browser could not be verified (App Check) - reload the page and try again'
  if (/api-not-enabled|has not been used in project|requires the Firebase AI API/i.test(msg)) return 'not switched on for this Firebase project yet'
  if (/429|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(msg)) return 'free limit reached, try later or another model'
  if (/401|403|(invalid|valid) api key|unauthori[sz]ed/i.test(msg)) return 'API key was rejected'
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'not reachable (is it running, and does it allow this site?)'
  if (/timed? ?out|TimeoutError/i.test(msg)) return 'took too long'
  return msg.length > 140 ? msg.slice(0, 140) + '…' : msg
}
