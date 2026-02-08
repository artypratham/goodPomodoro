# 🍅 Pomodoro Focus

A premium, minimal dark-themed Pomodoro timer application with streak tracking, customizable timers, and a beautiful calendar view inspired by LeetCode's contribution graph.

![Pomodoro Focus](https://via.placeholder.com/800x500/000000/ff6b35?text=Pomodoro+Focus)

## ✨ Features

### Timer Features
- **Customizable Focus Duration**: Default 25 minutes, adjustable from 1-120 minutes
- **Short Break**: Configurable break after each focus session (default: 5 min)
- **Long Break**: Extended break after completing a set of focus sessions (default: 15 min)
- **Sessions Before Long Break**: Customize how many sessions before a long break
- **Auto-start Options**: Automatically start breaks or focus sessions
- **Premium Animations**: Smooth pulse animations while timer runs, celebration on completion

### Tracking Features
- **Daily Session Tracking**: See how many sessions you completed each day
- **Streak System**: Track your daily streaks (LeetCode-style)
- **Calendar Heatmap**: Visual representation of your productivity over time
- **Total Statistics**: View total sessions, focus minutes, and longest streak

### Design
- **Pure Dark UI**: Complete black theme for minimal distraction
- **Premium Typography**: Outfit + JetBrains Mono fonts
- **Smooth Animations**: Glow effects, tick pulse, celebration animations
- **Minimal Interface**: Clean, focused design

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Redis (optional, for data persistence across devices)

### Installation

1. **Clone or download this project**
   ```bash
   cd pomodoro-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Redis (optional)**
   
   **macOS (with Homebrew):**
   ```bash
   brew install redis
   brew services start redis
   ```
   
   **Windows (with WSL or Docker):**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis
   
   # Or download from https://redis.io/download
   ```
   
   **Linux:**
   ```bash
   sudo apt install redis-server
   sudo systemctl start redis
   ```

4. **Start the application**
   
   **Development mode (with hot reload):**
   ```bash
   npm run dev
   ```
   
   **Production mode:**
   ```bash
   # Start the server first
   npm run server
   
   # Then start the Electron app
   npm start
   ```

## ☁️ Vercel Deployment (Web)

This repository ships an Electron desktop app plus a web-ready front-end and serverless API. Vercel hosts the web UI and the `/api` functions.

1. **Connect the repo to Vercel**
2. **Set environment variables** in the Vercel dashboard:
   - `REDIS_URL` (recommended: Upstash Redis `rediss://` URL)
   - `JWT_SECRET` (long random string)
   - `DATA_ENCRYPTION_KEY` (32-byte key in base64 or hex for encrypting settings/stats at rest)
3. **Deploy**. The web UI is served from `index.html`, and API routes live under `/api`.

To generate a 32-byte key locally:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📦 Build for Distribution

### Build for your platform
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Both
npm run build
```

The built application will be in the `dist/` folder.

## 🎯 Usage

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Start/Pause timer |
| `R` | Reset timer |
| `S` | Skip current session |

### Timer Modes
- **Focus Time** (Orange): Your productive work session
- **Short Break** (Teal): Quick rest between focus sessions
- **Long Break** (Purple): Extended rest after completing all sessions

### Session Indicator
The dots below the timer show your progress through the current set of focus sessions. Once all dots are filled, you'll get a long break.

## ⚙️ Configuration

### Timer Settings
| Setting | Default | Range |
|---------|---------|-------|
| Focus Duration | 25 min | 1-120 min |
| Short Break | 5 min | 1-30 min |
| Long Break | 15 min | 1-60 min |
| Sessions Before Long Break | 4 | 1-10 |

### Automation Settings
- **Auto-start Breaks**: Automatically start break timer after focus ends
- **Auto-start Focus**: Automatically start focus timer after break ends
- **Sound Enabled**: Play notification sound when timer completes

## 🔐 Authentication

The app includes a simple authentication system using Redis:

1. **Create an account** on first launch
2. **Your data is stored** in Redis (or locally if Redis unavailable)
3. **Syncs across devices** when using the same Redis instance

### Security Notes
- Passwords are hashed with bcrypt.
- API requests use JWT auth.
- Basic rate limiting is enabled for login/register.
- Settings and stats are optionally encrypted at rest when `DATA_ENCRYPTION_KEY` is set.

### Offline Mode
If Redis is unavailable, the app automatically falls back to local storage. All features work normally, but data won't sync across devices.

## 🏗️ Project Structure

```
pomodoro-app/
├── main.js          # Electron main process
├── index.html       # Main UI (single-file React-style app)
├── server.js        # Express backend with Redis
├── package.json     # Dependencies and scripts
├── assets/          # Icons and images
└── README.md        # This file
```

## 🎨 Design Philosophy

### Color Palette
- **Background**: Pure black (#000000)
- **Focus Accent**: Vibrant orange (#ff6b35)
- **Short Break**: Teal (#4ecdc4)
- **Long Break**: Purple (#a855f7)
- **Text**: White/Gray scale

### Typography
- **Display/UI**: Outfit (variable weight)
- **Numbers/Code**: JetBrains Mono

### Animations
- Pulse glow on running timer
- Tick animation each second
- Celebration animation on completion
- Smooth transitions throughout

## 🔧 Troubleshooting

### "Cannot connect to Redis"
- Make sure Redis is running: `redis-cli ping` should return `PONG`
- Check Redis is on port 6379
- The app will work in offline mode if Redis is unavailable

### Timer not visible
- Ensure fonts are loading (requires internet for Google Fonts)
- Try refreshing the app (Ctrl/Cmd + R)

### Data not syncing
- Check Redis connection
- Verify you're logged in with the same account

## 📄 License

MIT License - Feel free to modify and use as you wish!

## 🙏 Credits

Built with:
- [Electron](https://electronjs.org/) - Cross-platform desktop apps
- [Express](https://expressjs.com/) - Backend server
- [Redis](https://redis.io/) - Data persistence
- [Outfit Font](https://fonts.google.com/specimen/Outfit) - UI typography
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) - Monospace font

---

**Stay focused. Stay productive. 🍅**
