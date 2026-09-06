import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

const tg = vi.hoisted(() => ({
  getMe: vi.fn(async () => ({ displayName: 'Test' })),
  startUpdatesLoop: vi.fn(),
  onNewMessage: { add: vi.fn() },
  getPeer: vi.fn(async () => ({ type: 'chat', isForum: true })),
  iterDialogs: vi.fn(async function* () {
    yield { peer: { id: -100123, type: 'chat', chatType: 'supergroup', isForum: true, displayName: 'Group' } }
  }),
  iterForumTopics: vi.fn(async function* () {
    for (let id = 1; id <= 105; id++) yield { id, title: `Topic ${id}` }
  }),
  getForumTopicsById: vi.fn(async () => [{ title: 'General' }])
}))
vi.mock('@mtcute/web', () => ({ TelegramClient: class { constructor() { return tg } }, InputMedia: {} }))

let receive: (event: unknown) => void
let post: ReturnType<typeof vi.fn>
async function request(message: object) {
  post.mockClear()
  receive({ data: { requestId: 'test', message: { target: 'offscreen', ...message } } })
  await vi.waitFor(() => expect(post.mock.calls.some(([data]) => data.kind === 'response')).toBe(true))
  return post.mock.calls.find(([data]) => data.kind === 'response')![0].response
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  post = vi.fn()
  vi.stubGlobal('postMessage', post)
  vi.stubGlobal('addEventListener', (_type: string, listener: typeof receive) => { receive = listener })
  await import('../src/telegram-worker')
  await request({ type: 'INITIALIZE', credentials: { apiId: 1, apiHash: 'test' } })
})

describe('forum runtime', () => {
  it('identifies forums and lists every topic with string IDs', async () => {
    const chats = await request({ type: 'COMMAND', command: 'LIST_CHATS' })
    expect(chats.data[0].isForum).toBe(true)
    const result = await request({ type: 'COMMAND', command: 'LIST_TOPICS', payload: { chatId: '-100123' } })
    expect(result.ok).toBe(true)
    expect(result.data).toHaveLength(105)
    expect(result.data[104]).toEqual({ id: '105', name: 'Topic 105' })
  })

  it('rejects invalid chat IDs before contacting Telegram', async () => {
    const result = await request({ type: 'COMMAND', command: 'LIST_TOPICS', payload: { chatId: 'invalid' } })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('A valid group ID is required')
    expect(tg.getPeer).not.toHaveBeenCalled()
  })

  it('maps General and keeps notifications when topic lookup fails', async () => {
    const message = {
      id: 55, chat: { id: -100123, type: 'chat', isForum: true, displayName: 'Group' },
      replyToMessage: null, isTopicMessage: false, sender: { id: 42, displayName: 'Sender' },
      text: 'hello', isOutgoing: false, isMention: false, date: new Date(), link: 'https://t.me/c/123/55'
    }
    post.mockClear()
    tg.getForumTopicsById.mockRejectedValueOnce(new Error('unavailable'))
    tg.onNewMessage.add.mock.calls[0][0](message)
    await vi.waitFor(() => expect(post.mock.calls.some(([data]) => data.message?.type === 'TELEGRAM_EVENT')).toBe(true))
    expect(post.mock.calls.find(([data]) => data.message?.type === 'TELEGRAM_EVENT')![0].message.event).toMatchObject({ threadId: '1', topicName: '', chatTitle: 'Group' })
  })

  it.each([
    [true, true, 7, '7', 'General'],
    [true, false, 55, '1', 'General'],
    [false, false, null, '', '']
  ])('preserves message routing for forum=%s topic=%s thread=%s', async (isForum, isTopicMessage, thread, expectedId, expectedName) => {
    post.mockClear()
    tg.onNewMessage.add.mock.calls[0][0]({
      id: 56, chat: { id: -100123, type: 'chat', isForum, displayName: 'Group' },
      replyToMessage: thread === null ? null : { threadId: thread }, isTopicMessage,
      sender: { id: 42, displayName: 'Sender' }, text: 'hello', isOutgoing: false,
      isMention: false, date: new Date(), link: 'https://t.me/c/123/56'
    })
    await vi.waitFor(() => expect(post.mock.calls.some(([data]) => data.message?.type === 'TELEGRAM_EVENT')).toBe(true))
    expect(post.mock.calls.find(([data]) => data.message?.type === 'TELEGRAM_EVENT')![0].message.event).toMatchObject({ threadId: expectedId, topicName: expectedName })
    if (!isForum) expect(tg.getForumTopicsById).not.toHaveBeenCalled()
  })
})
