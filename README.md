# SONIXAI — Write Once. Create Everywhere.

> **Transform one script into professional audio and platform-ready video content — local-first, free-first.**

SonixAI converts **TEXT → AUDIO → VIDEO → MUSIC + SFX + SUBTITLES → PLATFORM FORMAT → THUMBNAIL → EXPORT → HISTORY** without mandatory paid APIs.

---

## ✨ Features

| Feature | Free / Local Implementation | Paid Alternative (NOT required) |
|---------|----------------------------|----------------------------------|
| **Text → Audio** | Piper TTS locally + FFmpeg WAV→MP3, SpeechSynthesis fallback | ElevenLabs, OpenAI TTS |
| **Text → Video** | Node + FFmpeg + deterministic templates + local backgrounds | Runway, Pika |
| **Music + SFX** | 8 licensed local assets per category, FFmpeg mixing, fade/loop | AI music generation |
| **Subtitles** | Deterministic timing from script+audio duration → WebVTT + FFmpeg burn-in | AI transcription |
| **Platform Formatting** | Deterministic config: YouTube 1920×1080 16:9, Shorts/Reels/TikTok 1080×1920 9:16, Square 1080×1080 1:1 | — |
| **Thumbnails** | Canvas/SVG + Sharp templates (YouTube/IG/Vertical) always works | Optional AI image |
| **Translation** | Provider abstraction: Local dictionary fallback (EN/TA/HI/TE/ML/ES/FR/DE) + optional external | Paid translation API |
| **Projects / History** | Firebase Firestore (free quota) + in-memory demo fallback | — |
| **Demo Mode** | Full workflow without keys | — |

### Core Philosophy
**LOCAL-FIRST — FREE-FIRST — AI-WHERE-IT-MATTERS — DETERMINISTIC-WHERE-POSSIBLE**

- Use **FFmpeg** for audio/video, not AI
- Use **JS config** for platform formatting
- Use **deterministic timing** for subtitles
- Use **Canvas/Sharp** for thumbnails
- Use **Firebase free quotas** (never claim unlimited)
- AI only where it genuinely adds value, and never required

---

## 🏗️ Architecture

```
USER SCRIPT
  → PiperService (local Piper binary + ffmpeg-synth fallback)
  → Audio (WAV→MP3)
  → FFmpegService (mix voice + music + SFX, render video)
  → SubtitleService (sentence split + duration → WebVTT/SRT)
  → Platform config (deterministic width/height/ratio)
  → ThumbnailService (Template provider → Sharp PNG/JPEG)
  → TranslationService (LocalProvider → optional ExternalProvider)
  → FirebaseService (Firestore + Storage) or in-memory fallback
  → Export (MP4/WebVTT/PNG in /public/exports + Firebase Storage)
```

**Routes → Controllers → Services → Middleware → Utilities**

- **Services:** PiperService, FFmpegService, VideoService (via ffmpegService), ThumbnailService, TranslationService, FirebaseService, StorageService
- **Middleware:** verifyToken (Firebase token, falls back to demo-user), errorHandler
- **Frontend:** HTML5 + CSS3 + Vanilla JS (ES6 modules) + Fetch + Audio/Video + Canvas

---

## 📁 Project Structure

```
sonixai/
  public/
    index.html
    pages/ login.html register.html dashboard.html create.html editor.html projects.html history.html settings.html
    css/ theme.css components.css
    js/ core/ pages/ components/ services/ utils/
    assets/ music/ sfx/ templates/ fonts/ images/
    exports/ (generated)
  server/
    server.js
    routes/ controllers/ services/ middleware/ config/ utils/ temp/
  .env.example  package.json  README.md
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **FFmpeg** (static build works; tested with ffmpeg 6.0 static https://johnvansickle.com/ffmpeg/)
- **Piper TTS** (optional — if missing, deterministic ffmpeg-synth + browser SpeechSynthesis fallback is used)
- **Firebase project** (optional — app runs in demo-local fallback without it)

### 1. Install
```bash
npm install
```

### 2. Environment
```bash
cp .env.example .env
# Edit .env — Firebase values are OPTIONAL for demo mode
# PORT=3000
# FIREBASE_PROJECT_ID=demo-sonixai
# FIREBASE_CLIENT_EMAIL=
# FIREBASE_PRIVATE_KEY=
# OPTIONAL_AI_IMAGE_API_KEY=
# OPTIONAL_TRANSLATION_API_KEY=
```

Application starts **without** optional keys. Do not expose private keys to frontend.

### 3. FFmpeg Setup
```bash
# Ubuntu/Debian (if you have sudo)
sudo apt install ffmpeg

# Or use static build (no sudo) — already supported
# Place binary at /tmp/node/bin/ffmpeg or set FFMPEG_PATH in .env
ffmpeg -version
```

### 4. Piper Setup (optional, for real TTS)
```bash
# Install piper: https://github.com/rhasspy/piper
# Download voices to ./models/piper/
# e.g. en_US-lessac-medium.onnx + .onnx.json
# Set in .env:
# PIPER_BINARY=/usr/local/bin/piper
# PIPER_MODELS_DIR=./models/piper
```
If Piper not installed, app uses `ffmpeg-synth` deterministic placeholder and browser `SpeechSynthesis` for preview. Exported audio will be real Piper once configured.

### 5. Firebase Setup (optional)
1. Create Firebase project → Firestore + Auth + Storage
2. Enable Email/Password (and optionally Google)
3. Create Service Account → download JSON → set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` in `.env`
4. For frontend, set `window.__FIREBASE_CONFIG__` with public web config (apiKey etc.) — demo uses `demo` placeholder and falls back to local auth.

### 6. Run
```bash
npm start          # http://localhost:3000
npm run dev        # watch mode (Node --watch)
```

### 7. Demo Mode (Zero Keys)
1. Open `http://localhost:3000`
2. Click **Demo Mode** or go to `/pages/dashboard.html`
3. Click **Run Demo Workflow** — verifies Text→Audio
4. Go to **Create** → enter script → **Generate Video** → **Save Project** → **History**

Judge can experience complete workflow: `Text → Audio → Video → Music → SFX → Subtitles → Platform Formatting → Thumbnail → History`.

---

## 🔌 API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tts` | {text, language, voice, speed} → {url, duration, engine} |
| POST | `/api/audio/mix` | {text, voice, music, musicVolume, sfx[]} → {url} |
| POST | `/api/video/render` | {script, platform, template, music, sfx, subtitles} → {url, vttUrl, width, height} |
| POST | `/api/thumbnail/generate` | {title, subtitle, template, background} → {url} |
| POST | `/api/translate` | {text, targetLang} → {translated} |
| GET | `/api/voices` | list Piper voices |
| GET | `/api/languages` | supported languages |
| GET/POST | `/api/projects` | CRUD + filters (search, type, language, platform) |
| GET/PUT/DELETE | `/api/projects/:id` | single project |
| POST | `/api/projects/:id/duplicate` | duplicate |
| POST | `/api/projects/:id/version` | create version (v1,v2…) |
| GET | `/api/projects/:id/versions` | list versions |
| GET/POST/DELETE | `/api/prompts` | prompt/script history |

All protected routes accept `Authorization: Bearer <FirebaseIdToken>` but fall back to `demo-user` in local mode.

---

## 🎨 UI / UX

- **Landing:** Hero + workflow bar + feature grid + free-first callout
- **Dashboard:** Sidebar (Dashboard/Create/Projects/History/Templates/Settings), Welcome, Recent Projects/Prompts, Quick Actions
- **Create Workflow:** Script → counts → Audio/Video → Language → Voice → Platform → Music → SFX → Subtitles → Template → Generate → Progress
- **Editor:** Top bar (save status, undo, preview, export), Left (Script/Audio/Music/SFX/Subtitles/Visuals/Thumbnail), Center (Video Preview), Bottom (Timeline: VIDEO/TEXT/VOICE/MUSIC/SFX/SUBTITLES), Right (Properties)
- **History:** Projects grid with search/sort/filter, prompt history with copy/reuse/delete
- **Responsive:** Desktop full editor, tablet condensed, mobile simplified
- **Accessibility:** Semantic HTML, keyboard nav, focus states, ARIA, good contrast, reduced-motion
- **Styling:** CSS variables, rounded cards, skeleton loaders, toasts, empty/error states — minimal, premium, dark-first + light toggle, no neon/glassmorphism clutter

---

## 🧪 Free-Cost Validation

| Check | Result |
|-------|--------|
| Text→Audio without paid API? | ✅ Piper (local) + ffmpeg-synth fallback |
| Video without paid API? | ✅ FFmpeg templates |
| Music without AI? | ✅ Local licensed assets |
| SFX without AI? | ✅ Local assets |
| Subtitles without AI? | ✅ Deterministic timing |
| Platform formatting without AI? | ✅ Config |
| Thumbnails without AI? | ✅ Canvas/Sharp |
| Projects/Auth via Firebase free quota? | ✅ + in-memory demo fallback |
| Demo works without optional AI keys? | ✅ All core works |

---

## 📦 Adding Music/SFX

Drop MP3 files into:
- `public/assets/music/calm.mp3`, `cinematic.mp3`, `corporate.mp3`, `energetic.mp3`, `lofi.mp3`, `inspirational.mp3`, `technology.mp3`, `ambient.mp3`
- `public/assets/sfx/click.mp3`, `whoosh.mp3`, `pop.mp3`, `notification.mp3`, `transition.mp3`, `ambient.mp3`, `keyboard.mp3`, `success.mp3`

Ensure files are properly licensed (public domain / royalty-free). Placeholders are sine tones for demo.

---

## 🔧 Optional AI Configuration

```bash
# In .env — leave empty to stay 100% free
OPTIONAL_AI_IMAGE_API_KEY=   # if set, AIThumbnailProvider wraps Template provider
OPTIONAL_TRANSLATION_API_KEY= # if set, ExternalTranslationProvider is tried first
```
Core thumbnail/translation always works via template/local providers.

---

## 🐛 Troubleshooting

- **FFmpeg not found:** Set `FFMPEG_PATH=/tmp/node/bin/ffmpeg` or install via apt; server will log fallback mode
- **Piper not found:** Normal for demo — see note in TTS response; install Piper for production TTS
- **Firebase not configured:** App uses in-memory storage; data resets on restart (expected for demo). Configure Firebase for persistence.
- **Video render fails:** Ensure ffmpeg binary is executable and `/server/temp` is writable; check `server/temp/` is gitkept
- **Port in use:** Change `PORT` in `.env`

---

## 📄 License & Rights

- Do not use copyrighted music/SFX without appropriate rights.
- Replace placeholder assets with licensed files for production.
- Firebase usage subject to Firebase free quotas.

---

## 🏆 Positioning

> **SonixAI turns one script into complete multimedia content.**

Local TTS + media processing + video composition + music + SFX + subtitles + platform formatting + thumbnails + translation + project management — **local-first, free-first, deterministic where possible, AI where it matters.**

