# OcFit / NorthernGlow — Command Reference

Everything you need from first install to shipping a build.

---

## 1. Setup (first time only)

```bash
# Install dependencies
npm install

# Install EAS CLI globally (one-time, required for builds)
npm install -g eas-cli

# Log in to Expo (required for EAS builds)
eas login

# Log in to Convex (required for backend deploys)
npx convex login
```

---

## 2. Running the App Locally

These commands run the app in development mode. You need **two terminals** — one for Convex, one for Expo.

### Terminal 1 — Convex backend
```bash
npm run convex:dev
# Equivalent: npx convex dev
```
Keeps the Convex backend in sync with your local code and watches for changes.

### Terminal 2 — Expo frontend
```bash
npm start
# Equivalent: expo start
```
Opens the Expo Dev Tools. From here you can:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Scan the QR code with the **Expo Go** app on your phone

### Run directly on a simulator (native builds)
```bash
npm run ios        # expo run:ios
npm run android    # expo run:android
```
Use these when you need a development build with native modules (e.g. push notifications, secure store).

---

## 3. Database / Seed Commands

```bash
# Seed the database with test data
npm run seed
# Equivalent: npx convex run --no-push seed:run

# Clear all seeded data
npm run seed:clear
# Equivalent: npx convex run --no-push seed:clear
```

---

## 4. Convex Backend Commands

```bash
# Deploy backend changes to production
npx convex deploy

# Open the Convex dashboard (data browser, logs, etc.)
npx convex dashboard

# Run a one-off function (example)
npx convex run <functionPath> '{"arg": "value"}'
```

---

## 5. EAS Builds (App Store / TestFlight / Internal)

### Build profiles (defined in eas.json)

| Profile | Purpose | Distribution |
|---|---|---|
| `development` | Dev client build (use with `npm start`) | Internal |
| `preview` | Internal testing / QA | Internal |
| `production` | App Store / Google Play submission | Store |
| `gym-preview` | White-label gym build — internal testing | Internal |
| `gym-production` | White-label gym build — store release | Store |

### Build commands

```bash
# Development client build
eas build --profile development --platform ios
eas build --profile development --platform android
eas build --profile development --platform all

# Preview / internal test build
eas build --profile preview --platform ios
eas build --profile preview --platform android
eas build --profile preview --platform all

# Production build (NorthernGlow default)
eas build --profile production --platform ios
eas build --profile production --platform android
eas build --profile production --platform all
```

### Submit to App Store / Google Play

```bash
# Submit the latest build
eas submit --platform ios
eas submit --platform android
```

---

## 6. White-Label Gym Builds

Use the build script to generate a fully branded app for a specific gym.
The script fetches branding from Convex, swaps assets, runs the EAS build, then restores defaults.

`NORTHERNGLOW_BUILD_SECRET` is stored in `.env.local` — source it before running any gym build.

```bash
# Build for both platforms (default)
source .env.local && BUILD_SECRET=$NORTHERNGLOW_BUILD_SECRET ./scripts/build-gym.sh <gymId>

# Build for iOS only
source .env.local && BUILD_SECRET=$NORTHERNGLOW_BUILD_SECRET ./scripts/build-gym.sh <gymId> --platform ios

# Build for Android only
source .env.local && BUILD_SECRET=$NORTHERNGLOW_BUILD_SECRET ./scripts/build-gym.sh <gymId> --platform android

# Preview (internal) build for a gym
source .env.local && BUILD_SECRET=$NORTHERNGLOW_BUILD_SECRET ./scripts/build-gym.sh <gymId> --platform android --profile gym-preview
source .env.local && BUILD_SECRET=$NORTHERNGLOW_BUILD_SECRET ./scripts/build-gym.sh <gymId> --platform ios --profile gym-preview
```

The `gymId` is the Convex document ID for the gym in your database.

---

## 7. OTA Updates (no build required)

Push a JS-only update instantly to existing installs:

```bash
eas update --branch production --message "Fix login bug"
```

---

## 8. Testing

Convex backend functions are tested with [vitest](https://vitest.dev) + [convex-test](https://github.com/get-convex/convex-test). Test files live inside `convex/` alongside the source they cover.

```bash
# Run all tests once
npm test
# Equivalent: npx vitest run

# Watch mode (re-runs on save)
npm run test:watch
# Equivalent: npx vitest

# Run a specific test file
npx vitest run convex/events.test.ts
```

---

## 9. TypeScript

```bash
# Type check (no emit)
npx tsc --noEmit
```

---

## Quick Reference

| What | Command |
|---|---|
| Start Convex backend | `npm run convex:dev` |
| Start Expo frontend | `npm start` |
| iOS Simulator | `npm run ios` |
| Android Emulator | `npm run android` |
| Seed database | `npm run seed` |
| Clear seed data | `npm run seed:clear` |
| Run tests | `npm test` |
| Watch tests | `npm run test:watch` |
| Deploy backend | `npx convex deploy` |
| Preview build (both) | `eas build --profile preview --platform all` |
| Production build (both) | `eas build --profile production --platform all` |
| White-label gym build | `source .env.local && BUILD_SECRET=$NORTHERNGLOW_BUILD_SECRET ./scripts/build-gym.sh <gymId>` |
| Submit to stores | `eas submit --platform ios/android` |
| OTA update | `eas update --branch production --message "..."` |
