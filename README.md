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

### Optional — Admin portal web app
```bash
cd admin
npm install
npm run dev
```
Starts the browser admin portal. Use this when you want to test `/login`, `/dashboard`, `/super`, gym settings, invites, and member management.

### Run directly on a simulator (native builds)
```bash
npm run ios        # expo run:ios
npm run android    # expo run:android
```
Use these when you need a development build with native modules (e.g. push notifications, secure store).

---

## 3. Routes and Access

NorthernGlow has two frontends:

- **Mobile app / Expo app**: the member, coach, and gym-facing native app in `app/`.
- **Admin portal / web app**: the browser admin app in `admin/`.

Both apps use Convex Auth. Convex is the source of truth for the current user, their `gymId`, and their `role`.

### Admin portal routes

Admin portal routes are defined in `admin/src/App.tsx`.

| Route | Who can open it | What it is for |
|---|---|---|
| `/` | Public | Marketing / landing page. |
| `/login` | Public | Sign in to the admin portal. |
| `/dashboard` | Signed-in users with a gym | Main gym overview: gym name, member count, pending invites, brand colour, timezone. |
| `/gym/settings` | Signed-in users with a gym | Gym branding/settings such as name, tagline, primary colour, timezone, custom domain, and email domain settings. |
| `/gym/invites` | Signed-in users with a gym; backend requires coach or admin | Send, view, and revoke invites for athletes, coaches, and admins in the current gym. |
| `/gym/members` | Signed-in users with a gym; backend requires coach or admin to list, admin to change roles | View members and change member roles. |
| `/gym/create` | Signed-in super admin with no gym | Create a gym and link the current super admin account to it as that gym's admin. |
| `/accept-invite` | Signed-in user with a pending admin invite | Accept a gym admin invite, agree to terms, and join that gym as admin. |
| `/super` | Signed-in super admin only | NorthernGlow staff panel for creating client gyms, sending admin invites, resending admin invites, and managing setup details. |
| `*` | Anyone | Unknown routes redirect back to `/`. |

### Admin portal guards

The web app uses three route guards:

- `AuthGuard`: checks Convex auth. If the user is not signed in, they go to `/login`.
- `GymGuard`: checks `api.users.getMe` and `api.invites.getMyAdminInvite`.
  - If the user has a `gymId`, they can enter normal gym routes.
  - If they have no `gymId` but do have a pending admin invite, they go to `/accept-invite`.
  - If they have no `gymId` and no admin invite, they go to `/gym/create`.
- `SuperAdminGuard`: checks `api.users.isSuperAdmin`. If false, the user is redirected to `/dashboard`.

Important: the UI guard is not the only protection. Convex mutations and queries also enforce access on the backend.

### Super admin access

Super admins are NorthernGlow staff accounts. They are controlled by the Convex environment variable:

```bash
NORTHERNGLOW_SUPERADMIN_EMAILS=you@example.com,another@example.com
```

A signed-in user is a super admin when their account email appears in that comma-separated allowlist. The checks live in `convex/users.ts` and `convex/helpers.ts`.

Super admin can:

- Open `/super`.
- Create a new client gym through `api.invites.superAdminCreateGym`.
- Send the first admin invite for that gym.
- View pending admin invites across gyms.
- Resend an admin invite.
- Register and verify email-domain setup for a gym.

The `/super` flow is meant for onboarding client gyms. It creates the gym and sends an invite to the gym owner's/admin's email. It does **not** add the super admin to that client gym.

There is also `/gym/create`, which calls `api.invites.createGymWithAdmin`. That path creates a gym and links the current super admin to it as admin. It only works if the super admin is not already part of a gym.

### Gym admin access

A gym admin is a user document with:

- `gymId`: the gym they belong to.
- `role: "admin"`.

Gym admins usually get access like this:

1. A super admin creates the gym from `/super`.
2. The system sends an admin invite to the gym owner's email.
3. The gym owner signs in at `/login` using the same invited email.
4. Because they have no `gymId` and do have a pending admin invite, `GymGuard` sends them to `/accept-invite`.
5. They accept terms and the invite.
6. Convex links their user to the gym and assigns the invited role, usually `admin`.
7. They land on `/dashboard`.

Gym admins can manage their own gym only. Backend checks compare the caller's `gymId` against the documents they are reading or editing.

Gym admins can:

- View the dashboard.
- Edit gym settings.
- Send invites for athletes, coaches, and admins.
- Revoke pending invites.
- View members.
- Change roles for members in the same gym.

Admins cannot change users from another gym. They also cannot demote themselves away from admin; another admin must do that.

### Coach and athlete access

Roles used by the app:

| Role | Meaning |
|---|---|
| `admin` | Gym owner/operator. Full gym management access for that gym. |
| `coach` | Staff user. Can manage coaching workflows and send/list invites where backend allows coach-or-admin access. |
| `athlete` | Regular member. Can use athlete-facing app screens and book/log activity. |

Backend helpers:

- `requireAuth`: user must be signed in and linked to a gym.
- `requireCoachOrAdmin`: user must be signed in, linked to a gym, and have role `coach` or `admin`.
- `requireSuperAdmin`: user email must be in `NORTHERNGLOW_SUPERADMIN_EMAILS`.

### Mobile app routes

Mobile routes are file-based Expo Router routes in `app/`.

| Route / file | Who sees it | What it is for |
|---|---|---|
| `/(auth)/login` | Signed-out users | Login screen. |
| `/(auth)/register` | Signed-out users | Registration screen. Account creation is invite-aware through Convex. |
| `/(tabs)` | Signed-in users | Main tab shell. Redirects signed-out users to login. |
| `/(tabs)/index` | Signed-in users | Home screen. |
| `/(tabs)/schedule` | Athletes in the tab bar | Athlete schedule and class booking. Hidden from coaches/admins. |
| `/(tabs)/manage` | Coaches/admins in the tab bar | Coach/admin schedule management, class creation, availability, and events. Hidden from athletes. |
| `/(tabs)/wod` | Signed-in users | WOD screen. |
| `/(tabs)/profile` | Signed-in users | Profile screen. |
| `/(tabs)/history` | Hidden tab route | Activity/history screen opened by navigation. |
| `/(tabs)/documents` | Hidden tab route | Documents screen opened by navigation. |
| `/(tabs)/members` | Hidden tab route | Members screen opened by navigation. |
| `/class-form` | Coaches/admins by workflow | Modal for adding a class. |
| `/membership` | Signed-in users by workflow | Membership details. |
| `/event-detail` | Signed-in users by workflow | Event details and registration. |
| `/roster` | Coaches/admins by workflow | Class roster. |
| `/kiosk` | Coaches/admins by workflow | Kiosk/check-in style screen. |
| `/gym-settings` | Coaches/admins by workflow | Native gym settings screen. |

After mobile login, `GymLinker` in `app/_layout.tsx` runs `api.invites.checkAndAccept`. If the signed-in user's email has a pending invite, Convex links them to that gym and assigns the invite role.

---

## 4. Database / Seed Commands

```bash
# Seed the database with test data
npm run seed
# Equivalent: npx convex run --no-push seed:run

# Clear all seeded data
npm run seed:clear
# Equivalent: npx convex run --no-push seed:clear
```

---

## 5. Convex Backend Commands

```bash
# Deploy backend changes to production
npx convex deploy

# Open the Convex dashboard (data browser, logs, etc.)
npx convex dashboard

# Run a one-off function (example)
npx convex run <functionPath> '{"arg": "value"}'
```

---

## 6. EAS Builds (App Store / TestFlight / Internal)

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

## 7. White-Label Gym Builds

Use the build script to generate a fully branded app for a specific gym.
The script fetches branding from Convex, swaps assets, runs the EAS build, then restores defaults.

`NORTHERNGLOW_BUILD_SECRET` must match the Convex deployment environment variable.
For local commands, store it in `.env.local`; for GitHub Actions, store it as a repository secret.

### Important IDs

| ID | Example | Where it comes from | Notes |
|---|---|---|---|
| `gymId` | `mh732pr7fmq9xr0y1cbnkt2n6185yrrg` | Convex `gyms` document ID | The input to build/submit workflows |
| iOS bundle ID | `com.northernglow.ocfit` | Generated from gym build config | One unique bundle ID per white-label app |
| Android package | `com.northernglow.ocfit` | Generated from gym build config | One unique package per white-label app |
| `ascAppId` | `1234567890` | App Store Connect app URL | Needed for non-interactive GitHub submit |
| `ASC_API_KEY_ID` | `ABCD123456` | App Store Connect API key page | GitHub secret for EAS Submit |
| `ASC_API_KEY_ISSUER_ID` | `00000000-0000-0000-0000-000000000000` | App Store Connect Users and Access > Integrations | GitHub secret for EAS Submit |
| `ASC_API_KEY_P8` | `-----BEGIN PRIVATE KEY-----...` | Downloaded App Store Connect API key file | GitHub secret containing the full `.p8` contents |

For white-labeling, each gym app is a separate Apple app:

```text
NorthernGlow default app  -> com.northernglow.app
OCFIT                     -> com.northernglow.ocfit
Next Gym                  -> com.northernglow.nextgym
```

The app display name can be `OCFIT`; the bundle ID is the technical Apple identifier and must be unique.

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

### First-Time iOS/TestFlight Setup for a New Gym

Apple requires one-time setup for every new white-label iOS app.
After this first setup, future builds/submits for the same gym can run through GitHub Actions.

1. Run one local interactive build to create Apple signing credentials:

```bash
source .env.local
BUILD_SECRET=$NORTHERNGLOW_BUILD_SECRET ./scripts/build-gym.sh <gymId> --platform ios --profile gym-production --interactive
```

When prompted by EAS/Apple:

```text
Log in to Apple account: yes
Register the gym bundle ID: yes
Reuse an existing distribution certificate: yes, if offered
Generate a provisioning profile: yes
```

2. Create the app in App Store Connect:

```text
App Store Connect > Apps > + > New App
Platform: iOS
Name: gym display name, e.g. OCFIT
Bundle ID: gym bundle ID, e.g. com.northernglow.ocfit
SKU: use the bundle ID, e.g. com.northernglow.ocfit
```

3. Copy the `ascAppId` from the App Store Connect URL:

```text
https://appstoreconnect.apple.com/apps/1234567890/...
                                      ^ ascAppId
```

### GitHub Actions Build

Use this for normal white-label builds:

```text
GitHub > Actions > Build Gym App > Run workflow
gymId: <Convex gym ID>
platform: ios
profile: gym-production
```

For internal, non-TestFlight QA builds, use `profile: gym-preview`.

### GitHub Actions Submit to TestFlight

The submit workflow needs these repository secrets:

```text
EXPO_TOKEN
NORTHERNGLOW_BUILD_SECRET
ASC_API_KEY_P8
ASC_API_KEY_ID
ASC_API_KEY_ISSUER_ID
```

After the `gym-production` build succeeds, copy the EAS build ID from the build URL:

```text
https://expo.dev/accounts/yacoub89/projects/northernglow/builds/<buildId>
```

Then run:

```text
GitHub > Actions > Submit iOS Build > Run workflow
gymId: <Convex gym ID>
buildId: <EAS build ID>
ascAppId: <App Store Connect numeric app ID>
whatToTest: optional TestFlight notes
```

Use `buildId` instead of "latest" for white-label apps so the workflow cannot accidentally submit another gym's build.

### TestFlight Sharing

After submit succeeds:

```text
App Store Connect > Apps > gym app > TestFlight
```

Wait for Apple to process the build.
For internal testers, add App Store Connect users to the build.
For external testers, create an external tester group, add the build, submit for Beta App Review, then invite testers or enable a public TestFlight link.

### First-Time vs Updates

First release for each new gym is semi-manual:

```text
Interactive EAS credential setup
Create App Store Connect app
Copy ascAppId
Submit first build
```

Future updates for that same gym are mostly automated:

```text
Run Build Gym App
Run Submit iOS Build with the same gymId and ascAppId
```

---

## 8. OTA Updates (no build required)

Push a JS-only update instantly to existing installs:

```bash
eas update --branch production --message "Fix login bug"
```

---

## 9. Testing

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

## 10. TypeScript

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
