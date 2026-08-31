# Chrome Web Store Listing — Telegram Custom Notifier

> Last Updated: 2026-08-31

## Store Listing

**Extension Name**

Telegram Custom Notifier

**Short Description**

Show filtered desktop notifications for selected chats from a locally connected Telegram account.

**Detailed Description**

Show local desktop notifications only for Telegram chats and messages that match your rules.

FEATURES
• Select private chats, groups, channels, and bots, including chats muted in another Telegram client
• Choose incoming, outgoing, both, or muted notification direction globally or per chat
• Apply quiet hours, text filters, regular expressions, mentions, sender IDs, topic IDs, and required keywords
• Show optional message previews, media labels, and forum topic names
• Review up to 100 recent matched messages in a resizable inbox with automatically collapsed multi-source groups and per-message, per-source, and dismiss-all controls
• Choose a quick popup or a persistent Chrome side panel for the message inbox
• Use the system appearance or explicitly choose light or dark mode
• Import or export Android-compatible settings JSON and back up settings to Saved Messages
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
Storage keeps local credentials, settings, state, and logs. Notifications display matched messages. Side Panel provides the optional persistent inbox. Offscreen and alarms keep the local MTProto Worker available while Chrome is running. Host access is limited to Telegram WebSocket endpoints.

SUPPORT
Report issues at https://github.com/guberm/telegram-notifier-chrome/issues or email michael@guber.dev.

INDEPENDENT SOFTWARE
Telegram Custom Notifier is independent software and is not affiliated with, endorsed by, or sponsored by Telegram.

Version 1.4.0 — Adds a resizable, grouped inbox with collapsible sources and per-source dismissal.

**What's New (Version 1.4.0)**

Inbox messages are now grouped into source sections that start collapsed when more than one source exists. Dismiss one source without clearing others, resize the Messages area vertically, and keep manually selected group states and scroll position stable when a message is dismissed. Individual Dismiss controls now lead each message row, and the empty state has proper spacing.

**Category**

Social & Communication

**Single Purpose**

Shows rule-filtered desktop notifications for selected chats from a locally connected Telegram account.

**Primary Language**

English

## Submission Package

**Chrome Web Store ZIP**

`release-artifacts/chrome-web-store/telegram-custom-notifier-chrome-web-store-v1.4.0.zip`

**SHA-256**

`977C0AAA870A74D45A1EBF5E90F7D258F2E3ECACD154B2BC17374FE45C4A2A53`

**Size**: 377,268 bytes

**Package status**: Validated Manifest V3 package with `manifest.json` at the ZIP root, 21 runtime files, no source maps, tests, development configuration, credentials, or repository files.

**Submission gate**: The ZIP, dashboard text, store icon, privacy policy, and two current screenshots are ready. Before CWS submission, complete a final installed-extension check in a normal Chrome profile. The 440×280 small promo tile remains optional.

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------:|--------|----------|
| Store Icon | 128×128 PNG | Ready | `public/icons/icon-128.png` |
| Screenshot 1 | 1280×800 PNG | Ready | `store-assets/screenshot-settings-v1.3.1.png` |
| Screenshot 2 | 1280×800 PNG | Ready | `store-assets/screenshot-side-panel-v1.4.0.png` |
| Small Promo Tile | 440×280 PNG | Not created | |

### Screenshot Notes

Screenshot 1 presents the current dark-mode settings interface, including Theme and Message view selection, account setup, and local-processing messaging. All displayed field values are placeholders.

Screenshot 2 presents the persistent Chrome side-panel inbox with collapsible source groups beside a generic browser page. Its dates, sources, and message previews are synthetic demonstration content.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Stores the user-supplied Telegram API credentials, local authorization state, selected chat IDs, notification rules, up to 100 recent popup inbox entries, bounded diagnostic log, and notification conversation state in the current Chrome profile. |
| `notifications` | permissions | Displays a Chrome desktop notification when a selected Telegram message passes the user's local rules and provides the test-notification feature. |
| `offscreen` | permissions | Hosts the extension-owned document that spawns the local Telegram MTProto Web Worker without opening a visible tab or window. |
| `alarms` | permissions | Periodically verifies that the local Telegram runtime is available while Chrome is running because Manifest V3 service workers are not persistent. |
| `sidePanel` | permissions | Shows the same local message inbox in Chrome's persistent side panel when the user selects Side panel instead of Popup. |
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

**Limited Use Disclosure**

Telegram Custom Notifier uses personal and sensitive user data only to provide and improve its disclosed notification, inbox, filtering, and settings-backup features. The extension does not use or transfer user data for advertising, creditworthiness, lending, or any unrelated purpose, and the developer cannot access or allow humans to read the user's Telegram data. The extension's use of user data complies with the Chrome Web Store User Data Policy, including its Limited Use requirements.

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
| 1.4.0 | 2026-08-31 | Resizable auto-collapsed source groups, stable view state, per-source dismissal, leading Dismiss controls, and corrected empty-state spacing | GitHub release; CWS package prepared |
| 1.3.1 | 2026-08-30 | Fix extension icon routing so the selected popup or persistent side-panel inbox opens correctly | GitHub release |
| 1.3.0 | 2026-08-30 | System/light/dark themes and user-selectable popup or persistent side-panel message inbox | GitHub release |
| 1.2.1 | 2026-08-30 | Actual text for fallback message types; every saved selected chat remains visible, including unavailable entries | GitHub release |
| 1.2.0 | 2026-08-30 | Popup message inbox with date, source, preview, per-item and dismiss-all controls, and Telegram links | GitHub release |
| 1.1.0 | 2026-08-30 | Rename, supplied icon, quick Android-compatible settings import/export in the popup, legacy backup restore | GitHub release |
| 1.0.0 | 2026-08-30 | Initial direct-MTProto notification release | GitHub release |

## Review Notes

### Known Issues / Limitations

- Chrome must be running.
- Secret Chats are not supported.
- The user supplies their own Telegram API ID and API Hash.
- The extension is independent and not affiliated with or endorsed by Telegram.
- The GitHub release does not constitute Chrome Web Store submission or approval.
