# DryRun

AI interview practice. A MERN app with JWT accounts, Gemini-written mock questions, scored answers, and interview history stored in MongoDB.

## Run it

Requires Node.js 18 or newer.

```powershell
cd $HOME\Desktop\ai-interview-prep
npm install
npm run install:all
```

Open `server/.env` and set `GEMINI_API_KEY`. Create a key in [Google AI Studio](https://aistudio.google.com/apikey).

```powershell
npm run dev
```

The first launch downloads MongoDB 7 (about 600 MB) into `server/node_modules/.cache`. Later launches reuse it.

Open http://localhost:5173. The API is http://localhost:5000.

`npm test` runs the server checks, including a full session: signup, generated questions, scored answers, a saved summary, and history that stays private to that account.

## What it does

- Register and log in. Passwords are hashed. The API expects an `Authorization: Bearer` JWT.
- Start an interview by role, level, style, and focus. Gemini writes 3 to 8 questions.
- Submit an answer. Gemini scores it from 0 to 10 and returns feedback, strengths, improvements, and a stronger sample answer.
- Finish the session for an overall score, a short coaching summary, and three things to practice next.
- History stays on your account. In-progress sessions can be resumed. Delete removes one.

The scoring rubric Gemini uses is stored on the server and is not sent to the browser.

## Data

With `MONGO_URI` unset, the API starts an embedded MongoDB and keeps data in `server/data/mongo`. That folder is local to this machine.

To use your own database, set:

```
MONGO_URI=mongodb://127.0.0.1:27017/dryrun
```

`docker-compose.yml` starts MongoDB on port 27017 if you install Docker later.

## Layout

- `server/` Express API: auth, interviews, Gemini calls
- `client/` React + Vite interface
- `server/src/services/gemini.js` question generation, answer scoring, session summary

`GEMINI_MODEL` defaults to `gemini-3.8-flash`. Change it in `server/.env` if you want a different Gemini model.
