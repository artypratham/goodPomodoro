# Pomodoro Focus (Next.js + Render API)

A premium, minimal Pomodoro timer rebuilt as a production-grade web app with a dedicated API backend. The UI retains the original dark aesthetic and animations while adding secure authentication, Google login, and a scalable database model.

## High-Level Architecture
- **Frontend**: Next.js app deployed on Vercel (`apps/web`)
- **Backend**: Express + Prisma API deployed on Render (`apps/api`)
- **Database**: Serverless Postgres (Neon)

The frontend calls the API over HTTPS using secure, httpOnly cookies. Auth sessions are short-lived access tokens with rotating refresh tokens.

## Features
- Pomodoro timer with focus/short break/long break modes
- Session tracking, streaks, and calendar heatmap
- Settings persistence
- Email/username login + password auth
- Google OAuth login
- Production-grade security headers, rate limiting, and HTTPS enforcement

## Repo Structure
```
apps/
  api/        # Express API + Prisma
  web/        # Next.js UI
legacy/       # Original Electron prototype (kept for reference)
```

## Local Development
### 1) Install dependencies
```
npm install
```

### 2) Configure env
Create `.env` files using the examples:
- `apps/api/.env.example`
- `apps/web/.env.example`

### 3) Prisma
```
cd apps/api
npx prisma generate
npx prisma migrate dev
```

### 4) Run dev servers
From repo root:
```
npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:4000

## Security Notes
- Passwords are hashed with bcrypt.
- Access tokens are short-lived; refresh tokens rotate.
- Auth cookies are `httpOnly` and `secure` in production.
- Origin checks + CORS allow only configured frontends.
- HTTPS is enforced in production.

## Deployment
Detailed Vercel + Render steps are included in the assistant response once implementation is complete.

## License
MIT
