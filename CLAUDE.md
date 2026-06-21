# DelivRoute — CLAUDE.md

> This file is the single source of truth for Claude Code across all build prompts.
> Read this fully before writing any code, creating any file, or running any command.

---

## What Is DelivRoute?

DelivRoute is a **B2B SaaS platform** that solves last-mile delivery inefficiency for e-commerce businesses. Delivery boys waste fuel and time delivering packages in a random order — often passing near an address they haven't visited yet. DelivRoute fixes this with dynamic route optimization.

**Three surfaces, one platform:**
- Mobile App (React Native) — for delivery boys
- Web Dashboard (Next.js) — for store owners
- Admin Panel (Next.js) — for the platform operator (super admin)

---

## Reference Documents

All detailed specs live in the `docs/` folder. Always check these before making architectural decisions:

| Document | File | When to Use |
|---|---|---|
| Product Requirements | `docs/DelivRoute_PRD.docx` | Feature scope, business model, user stories |
| Technical Requirements | `docs/DelivRoute_TRD.docx` | API contracts, DB schema, algorithm spec, security rules |
| App Flow | `docs/DelivRoute_AppFlow.docx` | Screen-by-screen flows, error paths, state diagrams |

---

## Monorepo Structure

```
delivroute/
├── apps/
│   ├── api/              # Node.js + Express + TypeScript backend
│   ├── web/              # Next.js 14 web dashboard + admin panel
│   └── mobile/           # React Native delivery boy app
├── packages/
│   └── shared/           # Shared TypeScript types across all apps
├── docs/
│   ├── DelivRoute_PRD.docx
│   ├── DelivRoute_TRD.docx
│   └── DelivRoute_AppFlow.docx
├── docker-compose.yml    # Redis only (Postgres is on Supabase)
├── package.json          # Root workspace config
├── tsconfig.base.json    # Base TS config extended by all apps
└── CLAUDE.md             # This file
```

---

## Tech Stack (Do Not Deviate)

### Database — Supabase (Postgres only)
- Supabase is used **only as a managed PostgreSQL database**
- Connect via Prisma using the Supabase connection string
- Do NOT use Supabase Auth, Realtime, Edge Functions, or Storage
- Use the **connection pooling URL** (port 6543) for the API server

### Mobile App — `apps/mobile`
| Concern | Library |
|---|---|
| Framework | React Native 0.74+ (bare workflow, no Expo) |
| Language | TypeScript 5 strict mode |
| Navigation | React Navigation v6 (Stack + Bottom Tab) |
| State | Zustand |
| Local storage | MMKV |
| HTTP | Axios with JWT interceptor (auto-refresh on 401) |
| Maps | react-native-maps |
| WebSocket | socket.io-client |
| Forms | React Hook Form |
| Push notifications | @react-native-firebase/messaging (FCM) |

### Web — `apps/web`
| Concern | Library |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript 5 strict mode |
| UI | Shadcn/UI + Tailwind CSS |
| Server state | TanStack Query |
| Auth | NextAuth.js |
| Maps | Leaflet.js (OSM) or @vis.gl/react-google-maps — based on MAP_PROVIDER env |
| Charts | Recharts |
| WebSocket | socket.io-client |

### API — `apps/api`
| Concern | Library |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 5 |
| Language | TypeScript 5 strict mode |
| ORM | Prisma (connects to Supabase PostgreSQL) |
| Cache + Sessions | Redis (Upstash free tier) |
| Real-time | Socket.io 4 |
| Auth | jsonwebtoken (HS256) |
| Password hashing | bcrypt (12 rounds) |
| Validation | Zod |
| Logging | Winston + Morgan |
| Testing | Jest + Supertest |
| Process | PM2 (production) |

---

## Database — 7 Tables (Prisma Schema)

All tables use UUID primary keys. Timestamps use DateTime with timezone. Soft deletes via deletedAt on user-facing entities.

```prisma
model Store {
  id            String    @id @default(uuid())
  name          String
  ownerId       String
  plan          Plan      @default(starter)
  status        StoreStatus @default(trial)
  createdAt     DateTime  @default(now())
  deletedAt     DateTime?
  owner         User      @relation("StoreOwner", fields: [ownerId], references: [id])
  users         User[]    @relation("StoreUsers")
  sessions      DeliverySession[]
  subscription  Subscription?
}

model User {
  id            String    @id @default(uuid())
  storeId       String?
  role          Role
  name          String
  phone         String?   @unique
  email         String?   @unique
  passwordHash  String
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  deletedAt     DateTime?
  store         Store?    @relation("StoreUsers", fields: [storeId], references: [id])
  ownedStore    Store?    @relation("StoreOwner")
  sessions      DeliverySession[]
  locations     Location[]
}

model DeliverySession {
  id          String          @id @default(uuid())
  storeId     String
  boyId       String
  date        DateTime
  status      SessionStatus   @default(pending)
  startedAt   DateTime?
  endedAt     DateTime?
  createdAt   DateTime        @default(now())
  store       Store           @relation(fields: [storeId], references: [id])
  boy         User            @relation(fields: [boyId], references: [id])
  packages    Package[]
}

model Package {
  id            String          @id @default(uuid())
  sessionId     String
  packageRef    String
  customerName  String
  addressRaw    String
  lat           Decimal         @db.Decimal(10, 7)
  lng           Decimal         @db.Decimal(10, 7)
  status        PackageStatus   @default(pending)
  orderIndex    Int
  failReason    String?
  deliveredAt   DateTime?
  createdAt     DateTime        @default(now())
  session       DeliverySession @relation(fields: [sessionId], references: [id])
  logs          DeliveryLog[]
}

model DeliveryLog {
  id          String    @id @default(uuid())
  packageId   String
  fromStatus  PackageStatus?
  toStatus    PackageStatus
  reason      String?
  createdAt   DateTime  @default(now())
  package     Package   @relation(fields: [packageId], references: [id])
}

model Location {
  id          String    @id @default(uuid())
  boyId       String
  lat         Decimal   @db.Decimal(10, 7)
  lng         Decimal   @db.Decimal(10, 7)
  recordedAt  DateTime
  createdAt   DateTime  @default(now())
  boy         User      @relation(fields: [boyId], references: [id])
}

model Subscription {
  id                String    @id @default(uuid())
  storeId           String    @unique
  plan              Plan
  gateway           String
  gatewaySubId      String    @unique
  status            SubStatus @default(active)
  currentPeriodEnd  DateTime
  createdAt         DateTime  @default(now())
  store             Store     @relation(fields: [storeId], references: [id])
}

enum Role         { super_admin store_owner delivery_boy }
enum Plan         { starter growth enterprise }
enum StoreStatus  { trial active suspended }
enum SessionStatus{ pending active completed }
enum PackageStatus{ pending delivered failed skipped }
enum SubStatus    { active past_due cancelled }
```

---

## API Structure

Base URL: `https://api.delivroute.com/v1`

All responses:
```json
{ "success": true, "data": {}, "meta": {} }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

**Route groups:**
```
/auth/*          → public
/sessions/*      → delivery_boy only
/packages/*      → delivery_boy only
/store/*         → store_owner only
/admin/*         → super_admin only
/billing/*       → store_owner only
```

All protected routes require: `Authorization: Bearer <access_token>`

**Auth middleware:** verify JWT, attach `req.user` with `{ id, role, storeId }`. Never trust storeId from request body — always use `req.user.storeId`.

---

## Auth System

| Action | How |
|---|---|
| Store owner register | `POST /auth/register-store` — create store + owner user, hash password with bcrypt |
| Login (all roles) | `POST /auth/login` — verify password, return access token (15min) + refresh token (7 days) |
| Refresh token | `POST /auth/refresh` — verify refresh token from Redis, issue new access token |
| Logout | `POST /auth/logout` — delete refresh token from Redis |
| Delivery boy invite | Store owner calls `POST /store/team` — generates 6-digit OTP stored in Redis (10min TTL), sends via SMS |
| Delivery boy onboard | `POST /auth/verify-otp` — verify OTP, create user account, return tokens |

**Tokens:**
- Access token: JWT HS256, 15 minutes, signed with `JWT_SECRET`
- Refresh token: UUID v4 stored in Redis with `refresh:{token}` key, TTL 7 days
- On refresh: old token deleted, new token issued (rotation)

---

## Route Optimization Algorithm

Located at: `apps/api/src/services/route-optimizer.service.ts`

**Algorithm:** Dynamic Nearest Neighbor

```
1. Receive packages[] with lat/lng + current GPS location
2. Call Distance Matrix API → n×n travel time matrix
3. Start from current location
4. Loop: pick nearest unvisited package → add to ordered[]
5. Return ordered package ID array with estimated times
6. Re-run after every delivery outcome (delivered or failed)
7. Failed packages → append to end → re-optimize remaining
```

**MapProvider abstraction:**
```typescript
interface MapProvider {
  geocode(address: string): Promise<{ lat: number; lng: number }>
  autocomplete(query: string): Promise<string[]>
  distanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<number[][]>
  getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult>
}
// GoogleMapsProvider — uses Google APIs (MAP_PROVIDER=google)
// OSRMProvider      — uses OpenStreetMap + OSRM (MAP_PROVIDER=osm)
```

Switch provider via `MAP_PROVIDER` env var — zero code changes required.

---

## Real-Time (Socket.io)

- Each store gets its own namespace: `/store-{storeId}`
- JWT auth middleware on socket connection
- GPS ping every 30 seconds from mobile app

**Events:**
```
location:update    client→server  { boyId, lat, lng, timestamp }
location:broadcast server→client  { boyId, lat, lng, timestamp, currentStop }
delivery:status    server→client  { packageId, status, boyId, timestamp }
session:started    server→client  { sessionId, boyId, totalPackages }
session:completed  server→client  { sessionId, boyId, delivered, failed }
```

Emit `delivery:status` and `session:*` events from controllers whenever package or session status changes.

---

## Environment Variables

### `apps/api/.env`
```env
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
REDIS_URL=rediss://[upstash-url]:6379
JWT_SECRET=                  # min 64 chars random string
JWT_REFRESH_SECRET=          # min 64 chars, different from JWT_SECRET
MAP_PROVIDER=                # "google" or "osm"
GOOGLE_MAPS_API_KEY=         # required when MAP_PROVIDER=google
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
FCM_SERVER_KEY=
NODE_ENV=                    # development | production
PORT=4000
```

> Note: Prisma needs both DATABASE_URL (pooled, port 6543) for queries and DIRECT_URL (direct, port 5432) for migrations. Both from Supabase dashboard → Settings → Database.

### `apps/web/.env.local`
```env
NEXTAUTH_SECRET=             # random string min 32 chars
NEXTAUTH_URL=                # http://localhost:3000 in dev
NEXT_PUBLIC_API_URL=         # http://localhost:4000/v1 in dev
NEXT_PUBLIC_MAP_PROVIDER=    # "google" or "osm"
NEXT_PUBLIC_GOOGLE_MAPS_KEY= # required when MAP_PROVIDER=google
```

### `apps/mobile/.env`
```env
API_URL=                     # http://localhost:4000/v1 in dev
MAP_PROVIDER=                # "google" or "osm"
GOOGLE_MAPS_API_KEY=
```

---

## Subscription Plans

| Plan | Max Delivery Boys | Price |
|---|---|---|
| starter | 5 | ₹999/month |
| growth | 20 | ₹2,999/month |
| enterprise | unlimited | custom |

Enforce plan limits server-side when adding delivery boys. Count `User` records where `storeId` matches and `role = delivery_boy` and `isActive = true`.

---

## Security Rules (Non-Negotiable)

1. All routes except `/auth/login`, `/auth/register-store`, `/auth/verify-otp` require JWT
2. Role middleware runs on every protected route — reads role from JWT claim
3. Every DB query for store-scoped data must use `req.user.storeId` — never from request body
4. Passwords never returned in any API response (use Prisma `select` to exclude `passwordHash`)
5. API keys (Maps, Razorpay) only called server-side — never in client code
6. Rate limit auth endpoints: 10 requests/minute per IP using `express-rate-limit`
7. All input validated with Zod before reaching controllers
8. Redis keys for OTP: `otp:{phone}` with 10 minute TTL
9. Redis keys for refresh tokens: `refresh:{token}` with 7 day TTL

---

## Error Codes

| HTTP | Code | When |
|---|---|---|
| 400 | VALIDATION_ERROR | Zod schema fails |
| 401 | UNAUTHORIZED | Missing or expired JWT |
| 403 | FORBIDDEN | Valid token, wrong role |
| 404 | NOT_FOUND | Resource doesn't exist or belongs to another store |
| 409 | CONFLICT | Duplicate phone, email, or package_ref |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unhandled exception |
| 503 | MAP_API_UNAVAILABLE | External routing API down |

---

## Package Status Flow
```
PENDING → DELIVERED  (boy marks success)
PENDING → FAILED     (boy marks fail with reason)
FAILED  → DELIVERED  (successful re-attempt)
FAILED  → SKIPPED    (session ended while still failed)
```

## Session Status Flow
```
PENDING → ACTIVE     (boy taps Start Delivery)
ACTIVE  → COMPLETED  (boy taps End Session)
```

---

## Screen Inventory

### Mobile App (14 screens)
Splash, PhoneEntry, OTPVerify, SetProfile, Permissions, Home, PackageEntry, RoutePreview, ActiveDelivery, FullRouteList, SessionSummary, DeliveryHistory, Profile/Settings

### Store Dashboard (12 pages)
Login, Register, Dashboard Home, Live Fleet Map, Deliveries, Package Detail, Team, Boy Detail, Reports, Subscription, Settings

### Admin Panel (8 pages)
Admin Login, Admin Dashboard, Stores List, Store Detail, Subscriptions, Revenue, Platform Analytics

---

## Coding Standards

- TypeScript strict mode everywhere — no `any`
- Zod schemas in `src/schemas/` — reused across routes
- Services handle all business logic — controllers only parse request and call service
- All async functions wrapped in try/catch — no unhandled promise rejections
- Winston logger in every controller: `logger.info()` on success, `logger.error()` on failure
- Never use `console.log` in production — Winston only
- Prisma queries always scoped: `where: { storeId: req.user.storeId }` for store data
- Never return `passwordHash` in any response — always use `select` to exclude it
- All files named exports except Next.js pages (default export required)
- Location records older than 90 days purged by a scheduled cron job

---

## Cost Summary (For Reference)

| Service | Free Tier | Notes |
|---|---|---|
| Supabase PostgreSQL | 500MB, 2 projects | Free for MVP |
| Upstash Redis | 10k commands/day | Free for MVP |
| Render (API hosting) | Free tier | Slower cold start |
| Railway (API hosting) | $5/month | Better performance |
| Vercel (Web hosting) | Free forever | No limits for this use case |
| Google Maps API | $200 credit/month | Free for low volume |
| Razorpay | Free to integrate | 2% per transaction |
| FCM push notifications | Free forever | No limits |

**MVP cost: ₹0 — ₹400/month depending on API hosting choice.**

---

## Build Prompt Progress Tracker

- [ ] Prompt 1  — Monorepo scaffold
- [ ] Prompt 2  — API app setup (Express + Prisma + Supabase connection)
- [ ] Prompt 3  — Prisma schema + migrations (runs against Supabase)
- [ ] Prompt 4  — Auth system (JWT + bcrypt + Redis OTP)
- [ ] Prompt 5  — Route optimizer service + MapProvider abstraction
- [ ] Prompt 6  — Session + package APIs
- [ ] Prompt 7  — Store owner APIs
- [ ] Prompt 8  — Super admin APIs + wire all routes
- [ ] Prompt 9  — Socket.io real-time location
- [ ] Prompt 10 — Mobile app setup + navigation
- [ ] Prompt 11 — Mobile auth screens
- [ ] Prompt 12 — Core delivery screens
- [ ] Prompt 13 — GPS tracking + Socket.io mobile
- [ ] Prompt 14 — Web app setup + NextAuth
- [ ] Prompt 15 — Store dashboard pages + live map
- [ ] Prompt 16 — Admin panel pages
- [ ] Prompt 17 — Razorpay billing
- [ ] Prompt 18 — Final cleanup + tests + Docker (Redis only)

---

## Notes for Claude Code

- Supabase is Postgres only — use Prisma for all DB access, never the Supabase JS client
- Prisma needs TWO connection strings from Supabase: DATABASE_URL (pooled port 6543) for runtime, DIRECT_URL (port 5432) for migrations
- Add `previewFeatures = ["driverAdapters"]` is NOT needed — standard Prisma connection works fine
- Socket.io namespaces are per-store: `io.of('/store-${storeId}')` — never broadcast across stores
- MAP_PROVIDER abstraction must always be respected — never hardcode Google Maps calls
- Location records purged after 90 days — add a cron job in Prompt 18
- Soft deletes on Store and User via deletedAt — never hard delete these two models
- docker-compose.yml only needs Redis — Postgres is fully managed by Supabase
- When checking plan limits, count active delivery boys: `prisma.user.count({ where: { storeId, role: 'delivery_boy', isActive: true, deletedAt: null } })`
