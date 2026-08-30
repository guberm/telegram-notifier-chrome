import type { BackgroundMessage, OffscreenMessage } from './shared/protocol'

interface WorkerResponse {
  kind: 'response'
  requestId: string
  response: { ok: boolean; data?: unknown; error?: string }
}

interface WorkerEvent {
  kind: 'event'
  message: BackgroundMessage
}

const worker = new Worker(new URL('./telegram-worker.ts', import.meta.url), { type: 'module' })
const pending = new Map<string, (response: WorkerResponse['response']) => void>()

worker.addEventListener('message', (event: MessageEvent<WorkerResponse | WorkerEvent>) => {
  if (event.data.kind === 'event') {
    void chrome.runtime.sendMessage(event.data.message)
    return
  }
  pending.get(event.data.requestId)?.(event.data.response)
  pending.delete(event.data.requestId)
})

chrome.runtime.onMessage.addListener((message: OffscreenMessage, _sender, sendResponse) => {
  if (message?.target !== 'offscreen') return undefined
  const requestId = crypto.randomUUID()
  pending.set(requestId, sendResponse)
  worker.postMessage({ requestId, message })
  return true
})

void chrome.runtime.sendMessage({ target: 'background', type: 'OFFSCREEN_READY' } satisfies BackgroundMessage)
