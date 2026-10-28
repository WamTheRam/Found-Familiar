# Found Familiar

A cozy, local-only personal organizer: **To-do**, **Health** and **Journal** tabs around one shared calendar.
React + Vite + TypeScript. Data lives in your browser's IndexedDB. No backend, accounts, analytics or network calls.

## Run it (Windows + VS Code)

1. Install Node.js LTS from https://nodejs.org if `node -v` does not work in a terminal.
2. Open the `found-familiar` folder in VS Code and run, in its terminal (Ctrl+`):

```
npm install
npm run dev
```

3. Open the address it prints (usually http://localhost:5173). On a phone, use the "Network" address on the same Wi-Fi.

Other commands: `npm test` (unit tests), `npm run typecheck`, `npm run build` (production build into `dist/`).

## Using the calendar

- Tap the month name, or swipe down on the dates, to open the full month. Swipe up or tap the month name to return.
- The arrows move by week (or by month when the month is open). Press and hold an arrow, or use **Go to month...**, to jump to any month and year.
- Dots under each date: circle = tasks (gold: something to do, sage: all done), square = a scheduled workout, diamond = a journal entry.
- In the full month, the **Journal view** switch shows mood colours and photo thumbnails. Otherwise a summary of the selected day links to each tab.
- The selected date is shared by all three tabs.

## Local storage limitations

- Data is stored in this browser profile only. Clearing site data, or using private browsing, deletes it.
- Different browsers, and `localhost` on different ports, have separate data. An Android app built with Capacitor also has its own separate storage and will not see data from the browser version.
- There is no backup or sync. Do not rely on this app as your only copy of anything important, including photos.
- Journal photos are downscaled (longest side 1600 px) and saved as JPEG to save space.

## Android APK without Android Studio (GitHub Actions)

The workflow `.github/workflows/android-debug-apk.yml` builds a debug APK on GitHub's servers. Nothing Android-related is installed on your PC.

1. Push the project to a GitHub repository (a **private** one is recommended, see below).
2. Open the repository's **Actions** tab, choose **Build Android debug APK**, and press **Run workflow**. It also runs on every push to `main`/`master`.
3. When the run finishes (about 5-10 minutes), open it and download **found-familiar-debug-apk** from *Artifacts*. Unzip it to get `app-debug.apk`.
4. Copy the APK to your phone, open it, and allow "install unknown apps" for the app you opened it from.

How it works: Node 22 and Java 21 are installed, `npm run build` creates `dist/`, then `npx cap add android` creates the Android project (or `cap sync` if an `android/` folder is already committed) and Gradle builds the debug APK. The whole web app is bundled inside the APK, so ordinary use needs no server and no internet connection.

- Versions: Capacitor 8.5.3 (pinned), Node 22, Java 21, Gradle 8.14.3 and Android Gradle Plugin 8.13 (from Capacitor's template), compile SDK 36, minimum Android 7.0 (API 24).
- `android-overrides/` holds the owl launcher icons, a plain parchment launch background, and a fixed debug signing key. The key is not a secret and is not for publishing: it only lets a new build update the installed app instead of conflicting with it.
- The APK is debug-signed. It is fine for your own phone, but not for the Play Store.
- Data lives inside the app on the phone. It is separate from the browser version's data, and uninstalling the app erases it. Install new builds over the old one (do not uninstall first).

## Structure

- `src/lib/`: pure logic and tests (dates, tasks, cycles, catch-up policy, moods, calendar indicators)
- `src/data/`: IndexedDB schema (`db.ts`) and the repository interface the UI uses
- `src/state.tsx`: shared selected date, active tab, calendar mode, tasks, journal and workout split
- `src/components/`, `src/tabs/`: screens
- `.github/workflows/`, `android-overrides/`, `capacitor.config.json`: Android build
