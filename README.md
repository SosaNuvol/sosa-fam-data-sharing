# sosa-fam-data-sharing

This app is for our family to share information privately. It is an Expo / React Native app for iPhone and Android, and it talks to [sosa-fam-api](https://github.com/SosaNuvol/sosa-fam-api).

## What works so far

- Create an account and sign in with email and password. Tokens are kept in the iOS Keychain or Android Keystore and refresh automatically.
- Create a family, or join one with an invite code.
- See the family's members, and switch between families if you belong to more than one.
- Owners and Adults can create a one-time invite code (Adult, Member or Child) and share it.

Next come the MVP features from the plan: the info vault, shared lists, events and reminders, and announcements.

## Run it

You need Node.js 20 or later, the API running (see the sosa-fam-api README), and the Expo Go app or a development build on your phone.

```bash
npm install
# Point the app at the API. A phone needs your computer's LAN address, not localhost.
echo "EXPO_PUBLIC_API_URL=http://192.168.1.50:5000" > .env.local
npx expo start
```

Scan the QR code with your phone's camera (iPhone) or with Expo Go (Android).

Checks before pushing:

```bash
npm run typecheck
```

## Layout

| Path | What it is |
| --- | --- |
| `src/app/` | Screens. Every file is a route (Expo Router). |
| `src/lib/api.ts` | API client: adds the token, refreshes it once on 401 |
| `src/lib/auth.tsx` | Signed-in user, their families, and the current family |
| `src/lib/tokenStore.ts` | Secure token storage |
| `src/lib/types.ts` | Shapes returned by the API |
| `src/components/ui.tsx` | Shared buttons, fields and text styles |

## Builds

Use EAS to build and ship to TestFlight and Google Play internal testing (`npx eas-cli@latest build`). The bundle id is `com.sosanuvol.sosafam`; change it in `app.json` before the first build if you prefer another.
