# Telegram Custom Notifier

A Manifest V3 Chrome extension that connects directly to a Telegram account and shows local desktop notifications only for chats and messages that match your rules.

The extension is independent, open source, and not affiliated with or endorsed by Telegram. It does not use a developer-operated backend.

## Features

- Phone, login-code, and two-step-password authorization through Telegram MTProto.
- Select individual private chats, groups, channels, and bots, including chats muted in another Telegram client.
- Global and per-chat direction: incoming, outgoing, both, or none.
- Quiet hours, including overnight windows.
- Case-insensitive text suppression and regular-expression suppression.
- Per-chat rules for mentions, allowed sender IDs, topic/thread IDs, and required keywords.
- Message previews with media labels for photos, video, documents, voice, audio, stickers, polls, locations, and contacts.
- Forum-topic titles formatted as `Group name - Topic name`.
- Separate notification conversations by chat, topic, and sender.
- Notification clicks open a Telegram message link when available; private conversations fall back to Telegram Web.
- Popup inbox with date, chat/sender source, message preview, per-message dismissal, dismiss-all, and Telegram links.
- Android-compatible JSON settings import/export and settings backup/restore through Saved Messages, with legacy Chrome backup support.
- Leave groups/channels, delete private history, and optionally block bots.
- Local health state, test notification, unread badge, and exportable diagnostic log without message contents.

## Install from a GitHub release

1. Download the ZIP from the latest release and extract it.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder.
5. Open the extension settings.
6. Create your own Telegram API ID and API Hash at [my.telegram.org/apps](https://my.telegram.org/apps), save them in the extension, and complete Telegram sign-in.
7. Refresh the chat list, select chats, and configure notification rules.

Disable Telegram Web/Desktop notifications if you do not want duplicate notifications from another Telegram client.

## Privacy and security

- The extension connects directly from Chrome to Telegram's WebSocket endpoints.
- API credentials and extension settings are stored in `chrome.storage.local` in the current Chrome profile.
- The encrypted Telegram authorization session and Telegram peer cache are stored in extension-owned IndexedDB.
- Message content is processed locally to evaluate filters and construct notifications.
- Up to 100 recent matched messages are retained locally for the popup inbox until dismissed.
- No analytics, advertising, telemetry, or developer-operated server is included.
- The diagnostic log stores event outcomes and errors, not message text, phone numbers, login codes, passwords, API hashes, or session keys.
- Logging out revokes the active Telegram authorization used by the extension. Removing the extension deletes its Chrome-owned local storage.

See [PRIVACY.md](PRIVACY.md) for the full policy.

## Platform limits

- Chrome must be running for notifications to arrive.
- Telegram Secret Chats are not supported. Browser MTProto libraries do not provide a reliable Secret Chat session implementation equivalent to TDLib.
- Telegram may deliver account updates to the most recently active authorized session. Network policy, account limits, or another active Telegram client can affect update delivery.
- A direct private-chat message does not have a permanent public `t.me` message URL, so those notifications open the corresponding Telegram Web chat.
- Chrome Web Store publication is prepared but not performed by this repository or release.

## Development

Requirements: Node.js 22+ and PowerShell on Windows for the release ZIP script.

```powershell
npm install
npm run check
npm run package
```

`npm run check` runs 21 focused tests, TypeScript validation, and the production Vite build. The package script creates a clean ZIP from `dist/` under `release-artifacts/` and prints its SHA-256.

## Architecture

- `service-worker.ts` owns Chrome APIs, persistent settings, filtering, notifications, badges, and logs.
- `offscreen.ts` is a minimal `chrome.runtime` bridge and spawns the Worker required by its declared offscreen reason.
- `telegram-worker.ts` runs `@mtcute/web`, WebSocket transport, IndexedDB session storage, Telegram authorization, dialogs, and message updates.
- `options.ts` provides account setup, chat selection, rules, backups, and diagnostics.
- `popup.ts` exposes the local message inbox, Telegram links, dismiss controls, status, the master switch, test notification, and settings shortcut.

All executable code, including the MTProto library and WASM crypto modules, is bundled in the extension package. No remotely hosted code is executed.

## License

[MIT](LICENSE)
