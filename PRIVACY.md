# Privacy Policy for Telegram Custom Notifier

Last updated: August 30, 2026

## What data the extension handles

Telegram Custom Notifier handles the Telegram API ID and API Hash supplied by the user, Telegram authorization data, selected chat identifiers, notification preferences, message-filter rules, chat metadata, and Telegram message contents needed to evaluate those rules and show local notifications.

The extension does not request or process general browsing history or content from websites the user visits.

## How data is stored

Telegram API credentials, extension settings, notification conversation history, notification links, and a bounded diagnostic log are stored locally in the extension's `chrome.storage.local` area. Telegram authorization keys and Telegram's peer/update cache are stored in extension-owned IndexedDB by the bundled MTProto client.

The diagnostic log does not include message text, phone numbers, login codes, two-step passwords, API hashes, or Telegram authorization keys.

## How data is transmitted and used

The extension connects directly to Telegram's WebSocket endpoints to authorize the user's Telegram account, receive account updates, list dialogs, manage user-requested chat actions, and back up or restore settings through the user's Saved Messages. Telegram authentication information and personal communications are therefore transmitted to and received from Telegram solely to provide the extension's notification functionality.

No data is transmitted to the extension developer. The extension has no developer-operated backend, analytics, advertising, telemetry, or crash-reporting service.

## Third-party service

The extension uses the Telegram API. Telegram's privacy policy is available at [telegram.org/privacy](https://telegram.org/privacy).

The bundled `@mtcute/web` library implements the Telegram MTProto client locally. It is packaged with the extension and is not loaded as remote code.

## Data sharing and sale

Data is not sold, rented, or shared with advertisers or data brokers. Data is exchanged only with Telegram as required for user-requested Telegram account functionality.

## Retention, export, and deletion

Settings remain in the current Chrome profile until the user changes them, clears extension data, or removes the extension. The user can import or export Android-compatible settings JSON and export diagnostic logs from the options page. Logging out revokes the active Telegram authorization used by the extension. Removing the extension deletes its Chrome-owned local storage and IndexedDB data.

If the user explicitly backs up settings to Saved Messages, that backup remains in the user's Telegram account until the user deletes it in Telegram.

## Changes to this policy

Material changes to data handling will be documented in this file and in the extension's release notes before publication.

## Contact

Privacy questions may be sent to michael@guber.dev or filed through the repository's public issue tracker.
