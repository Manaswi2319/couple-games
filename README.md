# CoupleGames

Simple React app with multiple mini-games:
- Tic-Tac-Toe (online via Firebase Realtime Database)
- Snake (single-player)
- Car Racing (single-player)

## Quick start (locally)
1. Install Node.js (14+)
2. Create app:
   npx create-react-app couple-games
3. Copy this project's files into the created folder (or use this repo)
4. Install dependencies:
   npm install
5. Fill your Firebase config in src/App.jsx (FIREBASE_CONFIG) to enable online Tic-Tac-Toe.
6. Start:
   npm start

## Deploy suggestions
- **Vercel / Netlify**: connect your GitHub repo and they auto-deploy `npm build`.
- **Firebase Hosting**: run `npm run build` then `firebase deploy --only hosting` (requires Firebase CLI and project setup).

## How to play online Tic-Tac-Toe
1. One partner clicks "Create Room" — share the room ID (string) that appears.
2. The other partner clicks "Join Room" and pastes the room ID.
3. Both click "Join Room" in the Tic-Tac-Toe view to register their name/symbol.
4. Play! Moves sync via Firebase Realtime Database.

Notes:
- This is a demo. For production, secure your Realtime DB rules and add authentication.
- If you want, I can provide a step-by-step deployment guide for Vercel or Firebase Hosting.

