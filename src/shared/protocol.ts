import type { AppConfig, NotificationEvent } from './config'
import type { AppChatType } from './telegram-mapper'

export interface Credentials {
  apiId: number
  apiHash: string
}

export interface RuntimeState {
  status: 'unconfigured' | 'connecting' | 'disconnected' | 'code-sent' | 'password-required' | 'connected' | 'error'
  userName: string
  error: string
  updatedAt: number
}

export interface ChatInfo {
  id: string
  title: string
  username: string
  type: AppChatType
  archived: boolean
  muted: boolean
}

export interface LogEntry {
  timestamp: number
  level: 'info' | 'skip' | 'error'
  message: string
}

export interface AppState {
  config: AppConfig
  credentials?: Credentials
  runtimeState: RuntimeState
  logs: LogEntry[]
  unreadCount: number
}

export type BackgroundMessage =
  | { target: 'background'; type: 'GET_APP_STATE' }
  | { target: 'background'; type: 'SAVE_CONFIG'; config: unknown }
  | { target: 'background'; type: 'SAVE_CREDENTIALS'; credentials: Credentials }
  | { target: 'background'; type: 'RUNTIME_COMMAND'; command: string; payload?: unknown }
  | { target: 'background'; type: 'TEST_NOTIFICATION' }
  | { target: 'background'; type: 'CLEAR_LOGS' }
  | { target: 'background'; type: 'MARK_SEEN' }
  | { target: 'background'; type: 'OFFSCREEN_READY' }
  | { target: 'background'; type: 'RUNTIME_STATE'; state: RuntimeState }
  | { target: 'background'; type: 'TELEGRAM_EVENT'; event: NotificationEvent }
  | { target: 'background'; type: 'RUNTIME_LOG'; level: LogEntry['level']; message: string }

export interface OffscreenMessage {
  target: 'offscreen'
  type: 'INITIALIZE' | 'COMMAND'
  credentials?: Credentials
  command?: string
  payload?: unknown
}
