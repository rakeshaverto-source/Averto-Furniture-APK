# Averto Driver

Android app for Averto's own delivery drivers. A driver signs in with the mobile number and PIN set in
the website's admin panel (**Admin → Drivers**). They then see the orders assigned to them once those
are **Dispatched**, start a delivery, and mark it delivered. While a delivery is on the way, the app
sends the phone's location to the website about every 30 seconds, even with the screen locked, and
the customer sees it on a map on their order page.

The app only talks to the website's `/api/driver/*` routes (in the `Furniture Averto` project).

## Screens

- **Sign in**: mobile number + PIN
- **My deliveries**: today's dispatched orders, pull down to refresh, sign out
- **Delivery**: address, time slot, items, cash to collect, Call, Navigate (Google Maps),
  **Start delivery** (turns on location sharing) and **Delivered** (turns it off)

## Building the APK on GitHub

Every push to `main` builds a signed APK on GitHub (see `.github/workflows/build-apk.yml`). It takes
about 10 to 15 minutes. The APK appears under **Releases**, and on the run's page under **Actions**.
Send it to the drivers on WhatsApp. A new build installs over the old one and keeps them signed in.

One-time setup, under the repository's **Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
|---|---|---|
| Variable | `AVERTO_API_URL` | The live website, e.g. `https://averto.in` (no slash at the end) |
| Secret | `KEYSTORE_BASE64` | The signing key file, base64-encoded |
| Secret | `KEYSTORE_PASSWORD` | The key file's password |
| Secret | `KEY_ALIAS` | The key's alias |
| Secret | `KEY_PASSWORD` | The key's password |

**Keep a copy of the signing key and its passwords somewhere safe (outside GitHub too).** If it is
lost, new APKs cannot install over the app already on the drivers' phones; they would have to
uninstall it and install again.

## On the driver's phone (once)

1. Allow installing apps from WhatsApp / the file manager when Android asks.
2. When starting the first delivery, allow location and choose **Allow all the time**.
3. In the app's settings (the app has an **Open app settings** link), set Battery to
   **Unrestricted**. Xiaomi, Vivo, Oppo, Realme and similar phones otherwise stop the app in the
   background. Some also need **Autostart** turned on.

## Developing

```bash
npm install
npm run typecheck
npm run lint
```

Background location needs a real build (it does not work in Expo Go on Android). With Android Studio
installed, `npm run android` builds and installs a debug version on a connected phone. Set
`AVERTO_API_URL` to the website address first, e.g. your computer's network address while running
the website locally.
