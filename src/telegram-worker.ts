import { InputMedia, TelegramClient, type Message, type TelegramClient as TelegramClientType } from '@mtcute/web'
import { isSettingsBackupFile, SETTINGS_BACKUP_FILE, type NotificationEvent } from './shared/config'
import type { BackgroundMessage, ChatInfo, Credentials, OffscreenMessage, RuntimeState } from './shared/protocol'
import { chatType, mediaKind, messageUrl } from './shared/telegram-mapper'

let client: TelegramClientType | null = null
let credentialsKey = ''
let pendingCode: { phone: string; phoneCodeHash: string } | null = null

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function sendBackground(message: BackgroundMessage): Promise<void> {
  globalThis.postMessage({ kind: 'event', message })
}

async function setState(status: RuntimeState['status'], userName = '', error = ''): Promise<void> {
  await sendBackground({ target: 'background', type: 'RUNTIME_STATE', state: { status, userName, error, updatedAt: Date.now() } })
}

async function mapMessage(message: Message): Promise<NotificationEvent> {
  const chatId = String(message.chat.id)
  const threadId = String(message.replyToMessage?.threadId ?? '')
  let topicName = ''
  if (message.isTopicMessage && threadId && message.chat.type === 'chat') {
    const [topic] = await requireClient().getForumTopicsById(message.chat, Number(threadId))
    topicName = topic?.title ?? ''
  }
  let url = ''
  try { url = message.link } catch {
    const username = message.chat.type === 'chat' ? message.chat.username ?? '' : ''
    url = messageUrl(chatId, username, message.id, threadId)
  }
  const media = message.media
  return {
    chatId,
    messageId: message.id,
    chatTitle: message.chat.displayName,
    topicName,
    senderId: String(message.sender.id),
    senderName: message.sender.displayName,
    text: message.text,
    outgoing: message.isOutgoing,
    mentioned: message.isMention,
    threadId,
    kind: mediaKind(media?.type, media?.type === 'video' && Boolean((media as { isAnimation?: boolean }).isAnimation)),
    timestamp: message.date.getTime(),
    url
  }
}

async function onNewMessage(message: Message): Promise<void> {
  try {
    await sendBackground({ target: 'background', type: 'TELEGRAM_EVENT', event: await mapMessage(message) })
  } catch (error) {
    await sendBackground({ target: 'background', type: 'RUNTIME_LOG', level: 'error', message: `Message mapping failed: ${errorMessage(error)}` })
  }
}

function requireClient(): TelegramClientType {
  if (!client) throw new Error('Telegram is not configured')
  return client
}

async function markConnected(): Promise<void> {
  const tg = requireClient()
  const me = await tg.getMe()
  await tg.startUpdatesLoop()
  await setState('connected', me.displayName)
}

async function initialize(credentials: Credentials): Promise<void> {
  const key = `${credentials.apiId}:${credentials.apiHash}`
  if (client && key === credentialsKey) return
  if (client) await client.destroy()
  await setState('connecting')
  credentialsKey = key
  client = new TelegramClient({ apiId: credentials.apiId, apiHash: credentials.apiHash, storage: `custom-chat-notifier-${credentials.apiId}` })
  client.onNewMessage.add((message) => { void onNewMessage(message) })
  try { await markConnected() } catch { await setState('disconnected') }
}

async function listChats(): Promise<ChatInfo[]> {
  const chats: ChatInfo[] = []
  for await (const dialog of requireClient().iterDialogs({ limit: 500, archived: 'keep' })) {
    const peer = dialog.peer
    chats.push({
      id: String(peer.id),
      title: peer.displayName,
      username: peer.username ?? '',
      type: chatType(peer.type, peer.type === 'user' && peer.isBot, peer.type === 'chat' ? peer.chatType : ''),
      archived: dialog.isArchived,
      muted: dialog.isMuted === true
    })
  }
  return chats
}

async function removeChat(payload: unknown): Promise<void> {
  const { chatId, blockBot = false } = payload as { chatId: string; blockBot?: boolean }
  const tg = requireClient()
  const peer = await tg.getPeer(Number(chatId))
  if (peer.type === 'user') {
    if (peer.isBot && blockBot) await tg.blockUser(peer)
    await tg.deleteHistory(peer, { mode: 'delete' })
  } else {
    await tg.leaveChat(peer)
  }
}

async function backupToSavedMessages(payload: unknown): Promise<void> {
  const json = JSON.stringify(payload, null, 2)
  await requireClient().sendMedia('self', InputMedia.document(new Blob([json], { type: 'application/json' }), {
    fileName: SETTINGS_BACKUP_FILE,
    fileMime: 'application/json'
  }), { caption: 'Telegram Custom Notifier settings backup' })
}

async function restoreFromSavedMessages(): Promise<unknown> {
  const tg = requireClient()
  for await (const message of tg.iterHistory('self', { limit: 100 })) {
    const media = message.media
    if (media?.type !== 'document' || !isSettingsBackupFile(media.fileName)) continue
    const bytes = await tg.downloadAsBuffer(media)
    return JSON.parse(new TextDecoder().decode(bytes))
  }
  throw new Error('No settings backup was found in Saved Messages')
}

async function command(name: string, payload: unknown): Promise<unknown> {
  const tg = requireClient()
  switch (name) {
    case 'CONNECT': await markConnected(); return null
    case 'SEND_CODE': {
      const phone = String((payload as { phone?: string })?.phone ?? '').trim()
      if (!phone) throw new Error('Phone number is required')
      const result = await tg.sendCode({ phone })
      if ('phoneCodeHash' in result) {
        pendingCode = { phone, phoneCodeHash: result.phoneCodeHash }
        await setState('code-sent')
      } else await markConnected()
      return null
    }
    case 'RESEND_CODE': {
      if (!pendingCode) throw new Error('Send a code first')
      const result = await tg.resendCode(pendingCode)
      pendingCode.phoneCodeHash = result.phoneCodeHash
      await setState('code-sent')
      return null
    }
    case 'SIGN_IN': {
      if (!pendingCode) throw new Error('Send a code first')
      try {
        await tg.signIn({ ...pendingCode, phoneCode: String((payload as { code?: string })?.code ?? '').trim() })
        pendingCode = null
        await markConnected()
      } catch (error) {
        if (errorMessage(error).includes('SESSION_PASSWORD_NEEDED')) await setState('password-required')
        else throw error
      }
      return null
    }
    case 'CHECK_PASSWORD': await tg.checkPassword(String((payload as { password?: string })?.password ?? '')); pendingCode = null; await markConnected(); return null
    case 'LIST_CHATS': return listChats()
    case 'REMOVE_CHAT': await removeChat(payload); return null
    case 'BACKUP_SAVED': await backupToSavedMessages(payload); return null
    case 'RESTORE_SAVED': return restoreFromSavedMessages()
    case 'DISCONNECT': await tg.disconnect(); await setState('disconnected'); return null
    case 'LOGOUT': await tg.logOut(); pendingCode = null; await setState('disconnected'); return null
    default: throw new Error(`Unknown command: ${name}`)
  }
}

globalThis.addEventListener('message', (event: MessageEvent<{ requestId: string; message: OffscreenMessage }>) => {
  const { requestId, message } = event.data
  if (message?.target !== 'offscreen') return
  void (async () => {
    try {
      if (message.type === 'INITIALIZE') {
        if (!message.credentials) throw new Error('Telegram API credentials are missing')
        await initialize(message.credentials)
        globalThis.postMessage({ kind: 'response', requestId, response: { ok: true } })
      } else {
        globalThis.postMessage({ kind: 'response', requestId, response: { ok: true, data: await command(message.command ?? '', message.payload) } })
      }
    } catch (error) {
      const text = errorMessage(error)
      await setState('error', '', text)
      globalThis.postMessage({ kind: 'response', requestId, response: { ok: false, error: text } })
    }
  })()
})
