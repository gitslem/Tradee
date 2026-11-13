/**
 * "Use my own model" settings. Stored in this browser's localStorage only -
 * never sent to Traddii. API keys go straight from the browser to the provider.
 */

export type OwnProviderId = 'ollama' | 'lmstudio' | 'openrouter' | 'groq' | 'gemini-key' | 'custom'

export interface ProviderPreset {
  id: OwnProviderId
  name: string
  /** Shown under the option in the picker */
  blurb: string
  where: 'computer' | 'online'
  /** 'ollama' uses Ollama's native API; everything else speaks the OpenAI chat format */
  api: 'ollama' | 'openai'
  defaultUrl: string
  defaultModel: string
  needsKey: boolean
  keyUrl?: string
  /** Only list model ids that pass this filter after "Test connection" */
  modelFilter?: (id: string) => boolean
  setup: string[]
}

export const PROVIDER_PRESETS: Record<OwnProviderId, ProviderPreset> = {
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    blurb: 'Free, runs on your computer',
    where: 'computer',
    api: 'ollama',
    defaultUrl: 'http://localhost:11434',
    defaultModel: 'qwen3:8b',
    needsKey: false,
    setup: [
      'Install Ollama from ollama.com/download.',
      'In Terminal, download a model: ollama pull qwen3:8b (about 5 GB, fine for 16 GB of memory). Lighter: qwen3:4b.',
      'Allow this site, then restart Ollama. macOS: launchctl setenv OLLAMA_ORIGINS "{origin}". Windows/Linux: set the environment variable OLLAMA_ORIGINS={origin}.',
      'Press Test connection below.'
    ]
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    blurb: 'Free desktop app, runs on your computer',
    where: 'computer',
    api: 'openai',
    defaultUrl: 'http://localhost:1234/v1',
    defaultModel: '',
    needsKey: false,
    setup: [
      'Install LM Studio from lmstudio.ai and download a model (for example Qwen 3 8B).',
      'Open the Developer tab, start the server, and turn on "Enable CORS".',
      'Press Test connection below and pick the model.'
    ]
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter (free models)',
    blurb: 'Online, free models with a free account',
    where: 'online',
    api: 'openai',
    defaultUrl: 'https://openrouter.ai/api/v1',
    defaultModel: '',
    needsKey: true,
    keyUrl: 'https://openrouter.ai/keys',
    modelFilter: id => id.endsWith(':free'),
    setup: [
      'Create a free account at openrouter.ai and make an API key.',
      'Paste the key below and press Test connection - only the free models are listed.',
      'Free models have daily limits; pick another one if a model is busy.'
    ]
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    blurb: 'Online, very fast, free tier',
    where: 'online',
    api: 'openai',
    defaultUrl: 'https://api.groq.com/openai/v1',
    defaultModel: '',
    needsKey: true,
    keyUrl: 'https://console.groq.com/keys',
    setup: [
      'Create a free account at console.groq.com and make an API key.',
      'Paste the key below and press Test connection, then pick a model.'
    ]
  },
  'gemini-key': {
    id: 'gemini-key',
    name: 'Gemini (your own key)',
    blurb: 'Online, your own free Google quota',
    where: 'online',
    api: 'openai',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: '',
    needsKey: true,
    keyUrl: 'https://aistudio.google.com/apikey',
    modelFilter: id => /gemini|gemma/i.test(id) && !/embed|image|tts|audio|live/i.test(id),
    setup: [
      'Get a free API key at aistudio.google.com/apikey.',
      'Paste the key below and press Test connection, then pick a model.',
      'Useful when Traddii\'s shared Gemini quota is used up.'
    ]
  },
  custom: {
    id: 'custom',
    name: 'Other (OpenAI-compatible)',
    blurb: 'Any service with an OpenAI-style API',
    where: 'online',
    api: 'openai',
    defaultUrl: '',
    defaultModel: '',
    needsKey: false,
    setup: [
      'Enter the API address ending in /v1 (for example https://api.mistral.ai/v1), the key if it needs one, and the model name.',
      'The service must allow requests from this website (CORS).'
    ]
  }
}

export interface ProviderConfig {
  url: string
  model: string
  apiKey: string
}

export interface OwnModelSettings {
  /** null = use Traddii's free Gemini only */
  active: OwnProviderId | null
  configs: Partial<Record<OwnProviderId, ProviderConfig>>
}

const STORAGE_KEY = 'ai-own-model'

export const configFor = (settings: OwnModelSettings, id: OwnProviderId): ProviderConfig => {
  const preset = PROVIDER_PRESETS[id]
  return {
    url: preset.defaultUrl,
    model: preset.defaultModel,
    apiKey: '',
    ...settings.configs[id]
  }
}

export const loadOwnModelSettings = (): OwnModelSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const active = parsed?.active in PROVIDER_PRESETS ? parsed.active : null
      return { active, configs: parsed?.configs ?? {} }
    }
  } catch {
    // fall through to defaults
  }
  return { active: null, configs: {} }
}

export const saveOwnModelSettings = (settings: OwnModelSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable (private mode) - settings last for this page only
  }
}
