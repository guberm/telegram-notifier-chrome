# Chrome Web Store Listing — Custom Chat Notifier

> Last Updated: 2026-08-30

## Store Listing

**Extension Name**

Custom Chat Notifier

**Short Description**

Show filtered desktop notifications for selected chats from a locally connected Telegram account.

**Detailed Description**

Show local desktop notifications only for Telegram chats and messages that match your rules.

FEATURES
• Select private chats, groups, channels, and bots, including chats muted in another Telegram client
• Choose incoming, outgoing, both, or muted notification direction globally or per chat
• Apply quiet hours, text filters, regular expressions, mentions, sender IDs, topic IDs, and required keywords
• Show optional message previews, media labels, and forum topic names
• Import or export settings as JSON and back up settings to Saved Messages
• Keep a local diagnostic log without message contents or authentication secrets

HOW TO USE
1. Open the extension settings
2. Enter your Telegram API ID and API Hash from my.telegram.org/apps
3. Complete Telegram phone, code, and optional two-step-password sign-in
4. Refresh the chat list and select the chats that should notify you
5. Configure global or per-chat notification rules

PRIVACY
The extension connects directly from Chrome to Telegram. Credentials, session data, settings, message filtering, and notifications are handled in the current Chrome profile. There is no developer-operated server, analytics, advertising, or telemetry.

PERMISSIONS
Storage keeps local credentials, settings, state, and logs. Notifications display matched messages. Offscreen and alarms keep the local MTProto Worker available while Chrome is running. Host access is limited to Telegram WebSocket endpoints.

SUPPORT
Report issues at https://github.com/guberm/telegram-notifier-chrome/issues or email michael@guber.dev.

Version 1.0.0 — Initial public release.

**Category**

Social & Communication

**Single Purpose**

Shows rule-filtered desktop notifications for selected chats from a locally connected Telegram account.

**Primary Language**

English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------:|--------|----------|
| Store Icon | 128×128 PNG | Ready | `public/icons/icon-128.png` |
| Screenshot 1 | 1280×800 PNG | Ready | `store-assets/screenshot-options.png` |
| Screenshot 2 | 1280×800 PNG | Not created | |
| Small Promo Tile | 440×280 PNG | Not created | |

### Screenshot Notes

Screenshot 1 shows the account status, notification controls, quiet hours, suppression filters, and chat-selection interface. It must not show a real phone number, API Hash, login code, password, message content, or private chat name.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Stores the user-supplied Telegram API credentials, local authorization state, selected chat IDs, notification rules, bounded diagnostic log, and notification conversation state in the current Chrome profile. |
| `notifications` | permissions | Displays a Chrome desktop notification when a selected Telegram message passes the user's local rules and provides the test-notification feature. |
| `offscreen` | permissions | Hosts the extension-owned document that spawns the local Telegram MTProto Web Worker without opening a visible tab or window. |
| `alarms` | permissions | Periodically verifies that the local Telegram runtime is available while Chrome is running because Manifest V3 service workers are not persistent. |
| `https://*.web.telegram.org/*` | host_permissions | Allows the bundled MTProto client to connect directly to Telegram's official WebSocket data-center endpoints. No other websites are accessed. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes. Authentication information and personal communications are handled locally and exchanged directly with Telegram to provide the requested feature; nothing is collected by the developer.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|-------------------------|---------|----------------------------|
| Personally identifiable info | Yes | Yes, to Telegram | Telegram account authorization and chat identification | Telegram only |
| Authentication info | Yes | Yes, to Telegram | Sign in and maintain the user's Telegram session | Telegram only |
| Personal communications | Yes | Yes, from/to Telegram | Receive messages, evaluate rules, show notifications, and user-requested Saved Messages backup | Telegram only |
| Health info | No | No | Not used | No |
| Financial info | No | No | Not used | No |
| Location | No | No | Location messages are labeled locally; device location is not requested | No |
| Web history | No | No | Not used | No |
| User activity | Yes | No | Local preferences and bounded diagnostic outcomes | No |
| Website content | No | No | No content scripts or page access | No |

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**

https://github.com/guberm/telegram-notifier-chrome/blob/main/PRIVACY.md

## Distribution

**Visibility**: Public
**Regions**: All regions where Telegram and Chrome Web Store distribution are permitted
**Pricing**: Free

## Developer Info

**Publisher Name**: Michael Guber
**Contact Email**: michael@guber.dev
**Support URL**: https://github.com/guberm/telegram-notifier-chrome/issues
**Homepage URL**: https://github.com/guberm/telegram-notifier-chrome

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-08-30 | Initial direct-MTProto notification release | Draft |

## Review Notes

### Known Issues / Limitations

- Chrome must be running.
- Secret Chats are not supported.
- The user supplies their own Telegram API ID and API Hash.
- The extension is independent and not affiliated with or endorsed by Telegram.
- The GitHub release does not constitute Chrome Web Store submission or approval.
