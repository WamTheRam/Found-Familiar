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

## Packaging for Android with Capacitor (prepared, not yet tested)

`capacitor.config.json` and the app icon (`public/icon-512.png`) are ready. Nothing Capacitor-related is installed by default, so the web app stays light.

1. Add Capacitor: `npm install @capacitor/core @capacitor/cli @capacitor/android`
2. Build the web app: `npm run build`
3. Create the Android project: `npx cap add android`, then after later web changes `npm run build` and `npx cap sync android`

Turning the Android project into an installable APK needs the Android SDK and Gradle build tools. The usual way to get them is Android Studio. Command-line SDK tools also work, but that setup is outside this project. Until then, the web app can run in a phone browser on your Wi-Fi.

Data access goes through the repository interface in `src/data/repository.ts`, so a native storage implementation could replace IndexedDB later without changing the screens.

## Structure

- `src/lib/`: pure logic and tests (dates, tasks, cycles, catch-up policy, moods, calendar indicators)
- `src/data/`: IndexedDB schema (`db.ts`) and the repository interface the UI uses
- `src/state.tsx`: shared selected date, active tab, calendar mode, tasks, journal and workout split
- `src/components/`, `src/tabs/`: screens
