# Found Familiar

A local-only personal organizer: To-do, Health and Journal tabs around one shared calendar.
React + Vite + TypeScript. Data lives in your browser's IndexedDB. No backend, accounts or analytics.
im highkey just practicing mobile dev but i have no space so i am NOT doing android studio

## Run it (Windows + VS Code)

1. Install Node.js LTS from https://nodejs.org if `node -v` in a terminal does not work.
2. Extract the ZIP so you have a `found-familiar` folder. In VS Code: File > Open Folder.
3. Open the terminal (Ctrl+`) and run:

```
npm install
npm run dev
```

4. Open the address it prints (usually http://localhost:5173). On your phone, use the "Network" address on the same Wi-Fi.

Other commands: `npm test` (unit tests), `npm run typecheck`, `npm run build`.

## Local storage limitations

- Data is stored in this browser profile only. Clearing site data, or using private browsing, deletes it.
- Different browsers, and localhost on different ports, have separate data.
- There is no backup or sync yet. Do not rely on this app as your only copy of anything important.

## Structure

- `src/lib/dates.ts`: local `YYYY-MM-DD` date maths (timezone-safe, Monday-first weeks)
- `src/data/`: IndexedDB schema (`db.ts`) and the repository interface the UI uses
- `src/state.tsx`: shared selected date, active tab, calendar mode
- `src/components/`: calendar, tabs, logo
- `src/tabs/`: tab screens (placeholders until Stages 2-4)
