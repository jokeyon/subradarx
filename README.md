# subradax (Expo / React Native)

Cross-platform subscription tracker: track renewals locally, local notifications, **free up to 3 items**, **Premium** via `react-native-iap` (product IDs **`subradarpro_monthly`** / **`subradarpro_yearly`**, see `lib/constants.ts`; base pricing **$3.99/mo** and **$39.99/yr** USA — set in App Store Connect / Play Console).

## Why this exists

You can develop on **Windows** (Android / JS). **iOS binaries** still come from **EAS Build** (cloud Mac) or a Mac with `expo run:ios` — no local Xcode required on your PC for cloud builds.

## Setup

```bash
cd subradar-expo
npm install
```

Add image assets under `assets/` (see `assets/README.txt`). Minimum: `icon.png`, `splash-icon.png`, `adaptive-icon.png`. Without them, `expo start` may error until you add placeholders.

`npx tsc --noEmit` should pass after install (fixes were applied for **expo-file-system v19** `File` / `Paths` API).

## Run

```bash
npx expo start
```

- **Expo Go**: UI works; **in-app purchases will not**. Use **Settings → Simulate Pro** (dev builds only) to test paywall bypass.
- **Real IAP**: create a **development build** (`npx expo install expo-dev-client`, then `eas build --profile development` or `npx expo run:ios` / `run:android`).

## EAS

1. Install CLI: `npm install -g eas-cli` (or use `npx eas-cli` / `npx eas`).
2. `eas login` with your Expo account.
3. From `subradar-expo`, run **`eas init`** once. Copy the **project ID** into `.env` as `EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` and keep `app.config.js` `extra.eas.projectId` reading that env var (do **not** ship the placeholder `00000000-...`).

### App Store Connect: build, upload, distribute (iOS)

You can do this from **Windows**: the iOS `.ipa` is built on **EAS cloud Macs**.

**Before the first build**

1. **Apple Developer Program** (paid) and **App Store Connect** access.
2. **Identifiers** (developer.apple.com): create an **App ID** whose bundle ID matches **`com.jokeyon.subradar`** (or change `app.config.js` → `ios.bundleIdentifier` to the ID you registered).
3. **App Store Connect** → **My Apps** → **+** → New App: choose iOS, same bundle ID, name **SubRadar Max** (or your final name).
4. **Agreements, Tax, and Banking**: complete **Paid Applications** only when you enable paid subscriptions (see below).
5. **In-app purchases (optional on first release)**  
   - By default **`IAP_ENABLED` is off** (no `EXPO_PUBLIC_IAP_ENABLED` in the build): the app does **not** call StoreKit, and **all features** (unlimited renewals + export) are available — you can ship **without** creating IAP in App Store Connect.  
   - When you are ready: create **two** auto-renewable subscriptions in the **same subscription group**, with IDs **`subradarpro_monthly`** and **`subradarpro_yearly`** (must match `lib/constants.ts`), set USA pricing to **$3.99/month** and **$39.99/year** (other regions via pricing tiers), add any **introductory offers** in ASC, set **`EXPO_PUBLIC_IAP_ENABLED=1`** in EAS build env (or `.env` for local builds), rebuild, then associate the IAPs with the app version for review.
6. **Gmail scan (optional):** off by default. The **「来自邮件」** screen always supports **paste + iOS Share extension**. To ship **Gmail OAuth + scan**, set **`EXPO_PUBLIC_GMAIL_IMPORT_ENABLED=1`**, configure **`EXPO_PUBLIC_GOOGLE_*`** client IDs, test on a real iOS build, then update App Store privacy answers — see `lib/constants.ts` (`GMAIL_IMPORT_ENABLED`).
7. **Assets**: use a real **1024×1024** `assets/icon.png` (no transparency for store), plus screenshots and metadata in ASC for the version you submit.
8. **Version**: user-facing version is `expo.version` in `app.config.js` (e.g. `1.0.0`). Each App Store upload needs a **higher `ios.buildNumber`** (same file) — EAS **`autoIncrement`** is not available with **`app.config.js`**, so increment it manually (e.g. `2`, `3`, …) before each store build. Bump **`version`** when you ship a new marketing version.

**Build for the store**

```bash
cd subradar-expo
npm run eas:build:ios
```

If `eas` complains about **Git**, install [Git for Windows](https://git-scm.com/download/win) and retry, or run **`npm run eas:build:ios:nogit`** (uses `EAS_NO_VCS=1`).

**First iOS build** must be run **interactively** (no `--non-interactive`) so EAS can create **distribution certificate** and **App Store provisioning profile** — answer the prompts or use *Let Expo handle it*. After credentials exist, non-interactive/CI builds work. Wait for the build on [expo.dev](https://expo.dev) (account **jokeyon**, project **subradar**).

**Upload to App Store Connect**

```bash
npm run eas:submit:ios
```

Use an **App Store Connect API key** (recommended) or **Apple ID** + app-specific password when the CLI asks. Alternatively upload the `.ipa` manually with **Transporter** on a Mac.

**Distribute**

1. In **App Store Connect** → your app → **TestFlight**: when processing completes, add **internal/external testers** or install yourself for smoke tests (including **real IAP**; Expo Go cannot test store IAP).
2. When ready, create an **App Store** version: attach the build, fill **Privacy Nutrition Labels**, **review notes** (how to test Pro if needed), and **submit for review**.
3. After approval, release **manually** or **automatically** per your ASC setting.

Optional: add `appleId` and `ascAppId` under `submit.production.ios` in **`eas.json`** to skip some prompts (IDs are on the app’s **App Information** page in ASC). See [EAS Submit iOS](https://docs.expo.dev/submit/ios/).

## Store configuration

- **iOS**: Bundle ID `com.jokeyon.subradar` (change in `app.config.js` to match your identifiers).
- **Android**: `com.jokeyon.subradar`.
- Create **iOS** subscription products in App Store Connect with IDs **exactly**:
  - `subradarpro_monthly` (monthly)
  - `subradarpro_yearly` (yearly)

**Android:** in-app subscription is **not enabled** in this app version; the Play build still runs with the **free tier** when `EXPO_PUBLIC_IAP_ENABLED=1` (same as iOS non-subscribers).

## Stack

Expo SDK 54, expo-router, AsyncStorage, expo-notifications, expo-sharing + expo-file-system (export), `react-native-iap`.

## Renewals

Each item can store an optional **https** link to the provider’s subscription or account page. On the edit screen, use **Open in browser** — the app does **not** cancel anything for you (compliance-friendly). The same field is included in **Pro → Export** and syncs through **`subradar-api`** when you use cloud backup.

## Roadmap & milestones

Strategic phases (US first, Canada second, mainland China later), acceptance checklists, and compliance notes: **[docs/PHASE-MILESTONES.md](./docs/PHASE-MILESTONES.md)**.

## Monorepo (initial product)

| Folder | Role |
|--------|------|
| `subradar-expo` | Mobile app (this folder) |
| `../subradar-api` | Backend: auth, renewals sync, Plaid, recurring suggestions |
| `../subradar-web` | Next.js: login, dashboard, Plaid Link (web), CSV export |

**Run API:** see `../subradar-api/README.md`. **Run web:** `cd ../subradar-web && npm run dev`.

Mobile **Settings → Account & sync** uses `EXPO_PUBLIC_API_URL` / `extra.apiUrl` (default `http://localhost:8787`). On a physical device, use your PC’s LAN IP or a tunnel — not `localhost`.

## Languages

**English** and **简体中文**. In **Settings → 语言 / Language**, choose **跟随系统 / Follow system**, **简体中文**, or **English**. Preference is saved on device; switching language reschedules local notifications in the active language.

## Flutter?

This folder is **Expo/RN only**. Flutter would be a separate project with different dependencies and tooling.
