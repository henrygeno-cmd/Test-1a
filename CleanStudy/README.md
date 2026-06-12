# CleanStudy 🧹📚

A mobile app (iOS + Android, built with Expo / React Native) that makes you **clean your space before you can study**.

## How it works

1. **Clean & Scan** — tidy your study space, then snap a photo with one big button (up to 3 angles).
2. **AI judges it** — Claude looks at your photos and gives a cleanliness score from 0–100% with quick tidying tips.
3. **Earn study tokens** — your score converts into ⚡ tokens at a rate **you** choose in Settings (default: 1 token per 10% clean, minimum 50% to earn anything).
4. **Spend tokens on study tools** inside your class folders:
   - 🃏 **Flashcards** — make cards for free, spend tokens to run a study session (tap to flip, "Got it / Again").
   - 🧠 **Memorize** — auto-generated quiz from your cards (multiple-choice with 4+ cards, reveal-and-self-grade otherwise).
   - 💬 **AI Tutor** — chat with Claude about your class; turn on 🔊 and replies are read out loud for a conversational feel.
5. **Class folders** keep each subject's cards and tutor conversations separate.

Everything (folders, cards, tokens, settings) is saved on the device.

## Running it

```bash
cd CleanStudy
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone (App Store / Play Store), or press `i` / `a` for a simulator.

### One-time setup in the app

Open **⚙️ Settings** and paste a Claude API key (get one at [console.anthropic.com](https://console.anthropic.com)). It powers the cleanliness check and the AI tutor, and is stored only on your device.

> Note: calling the Claude API directly from the app is fine for personal use. If you ever publish this app publicly, move the API calls behind a small server so your key isn't shipped inside the app.

## Settings you can tune

| Setting | What it does | Default |
|---|---|---|
| Tokens per 10% clean | How many study-tool uses you earn per 10% cleanliness | 1 |
| Minimum cleanliness | Below this %, a scan earns nothing | 50% |
| Tool prices | Token cost of Flashcards / Memorize / AI Tutor sessions | 1 / 1 / 2 |
| Read replies out loud | Conversational mode for the AI tutor | on |

## Tech

- Expo SDK 56, React Native, TypeScript
- `expo-image-picker` + `expo-image-manipulator` for the one-tap camera flow
- `@anthropic-ai/sdk` (Claude Opus 4.8) for vision-based cleanliness scoring (structured JSON output) and the tutor chat
- `expo-speech` for spoken tutor replies
- `@react-native-async-storage/async-storage` for on-device persistence
