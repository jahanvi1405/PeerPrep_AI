# PeerPrep AI — Backend

Production backend for **PeerPrep AI**, a peer skill-swap and AI-assisted interview
preparation platform. Built as a modular monolith on Node.js/Express with a strict
**Route → Controller → Service → Model** layering (business logic never lives in
routes or controllers).

Companion documents: `PeerPrep AI PRD v1.0` and `PeerPrep AI System Design Document`.

## Stack

- **Runtime:** Node.js (ES Modules, no TypeScript)
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (access + refresh) + Google OAuth (Passport)
- **AI:** Google Gemini API, isolated behind a single AI service module
- **Storage:** Cloudinary (avatars, resumes)
- **Docs:** OpenAPI/Swagger

## Folder Structure

```
src/
  config/         # env loading + validation, DB connection, third-party SDK setup
  controllers/    # thin request/response handlers only — no business logic
  docs/           # OpenAPI/Swagger spec + generation config
  middlewares/    # global security pipeline, error handler, Joi validation, route-specific rate limits, opt-in XSS sanitization
  models/         # Mongoose schemas
  routes/         # Express routers, one file per resource
  seed/           # database seed scripts
  services/       # all business logic lives here
  uploads/        # local multer temp storage before Cloudinary upload (gitignored)
  utils/          # pure helper functions (AppError, catchAsync, token helpers, etc.)
  app.js          # Express app: middleware pipeline + route mounting
  constants.js    # shared enums/constants (roles, statuses, etc.)
  index.js        # process entry point — connects DB, starts HTTP server
```

Business logic **only** lives in `services/`. Controllers call services and shape
the HTTP response; they never touch Mongoose models directly, and routes never
contain logic beyond wiring `router.method(path, middleware..., controller)`.

## Getting Started

```bash
npm install
cp .env.example .env   # fill in real secrets
npm run dev             # nodemon, http://localhost:5000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start in production mode |
| `npm run seed` | Run database seed scripts |
| `npm run lint` / `lint:fix` | ESLint (Airbnb base) |
| `npm run format` | Prettier |
| `npm test` | Jest + Supertest, in-memory MongoDB |

## Build Status

This backend is being built module-by-module against the System Design Document.

- [x] Phase 1 — Project setup (package.json, constants.js, config/env.js, app.js, index.js)
- [x] Phase 2 — Database connection (config/db.js, wired into index.js)
- [x] Phase 3 — Express app (middlewares/globalMiddleware.js, middlewares/errorHandler.js, routes/index.js, versioned API mount)
- [ ] Phase 4 — Constants (core enums already scaffolded in Phase 1 above)
- [x] Phase 5 — Middlewares (middlewares/validate.js, middlewares/rateLimiter.js, middlewares/sanitizeFields.js)
- [x] Phase 6 — Utilities (utils/appError.js, utils/catchAsync.js, utils/token.js)
- [x] Phase 7 — Authentication (User.js, RefreshToken.js models; authService.js; authController.js; authRoutes.js; middlewares/auth.js + authorize.js; config/passport.js — JWT access+refresh with type-checked payloads, jti, refresh-token rotation via SHA-256-hashed persistence, bcrypt password hashing in the service layer, Google OAuth via Passport, role-based authorization)
- [x] Phase 8 — User Profile & Skills (models/Profile.js, Skill.js, UserSkill.js; services/profileService.js, skillService.js; controllers/profileController.js, skillController.js; routes/profileRoutes.js, skillRoutes.js; seed/index.js — profile CRUD, public skill catalog, per-user skill attach/update/remove with ownership enforced via req.user)
- [x] Phase 9 — Interview Sessions & Scheduling (models/Session.js; services/sessionService.js; controllers/sessionController.js; routes/sessionRoutes.js — 5-state session lifecycle enforced via atomic status-filtered updates, host/participant ownership, host-vs-participant confirm asymmetry)
- [ ] Phase 10 — Mentor matching
- [ ] Phase 11 — Sessions
- [ ] Phase 12 — Reviews
- [ ] Phase 13 — AI module
- [ ] Phase 14 — Analytics
- [ ] Phase 15 — Uploads
- [ ] Phase 16 — Deployment
- [ ] Phase 17 — Swagger
- [ ] Phase 18 — Testing
