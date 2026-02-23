# dTopMate — Priority DMs Powered by Solana Micropayments

> **Status:** Phase 1 — Web2 Backend (Solana-ready architecture)
> **Grant Target:** Solana Foundation India Grant — Consumer Apps & Payments/Stablecoins tracks

A decentralized creator monetization platform where audiences pay creators to unlock direct messaging access. Built so every creator can monetize their attention, and every message is guaranteed to be worth reading.

---

## Project Vision

**The Problem:** Creators on social platforms are drowning in spam, bot messages, and low-quality DMs. Their attention is worth money, but there's no mechanism to enforce that.

**The Solution:** dTopMate introduces a payment gate for DMs. Audience members pay a creator's set price (in USD today, USDC/SOL tomorrow) to unlock direct messaging access. Creators only see messages from people who genuinely value their time.

**Why Solana?**
- Near-zero transaction fees make micropayments ($1–$20) economically viable
- Sub-second finality means DM access is unlocked almost instantly after payment
- USDC on Solana enables dollar-denominated pricing without USD volatility risk
- Solana Pay provides a beautiful, mobile-native checkout experience
- India is one of Solana's fastest-growing markets — creators in India need Web3-native monetization tools

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5 |
| Framework | Express.js |
| Database | PostgreSQL 16 (Docker) |
| ORM | Drizzle ORM |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod |
| Password Hashing | bcryptjs |
| Containerization | Docker + Docker Compose |

---

## Local Setup

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### 1. Clone & Install

```bash
git clone <repo-url>
cd dtopmate
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values (defaults work for local dev)
```

### 3. Start the Database

```bash
docker compose up -d
# Wait for the postgres health check to pass (5-10 seconds)
```

### 4. Run Database Migrations

```bash
# Generate migration files from schema
npm run db:generate

# Apply migrations to the database
npm run db:migrate
```

### 5. Start the Server

```bash
# Development (hot reload)
npm run dev

# Production build
npm run build && npm start
```

The server will be available at `http://localhost:3000`.

### Verify Setup

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "dTopMate API",
  "version": "1.0.0",
  "timestamp": "2024-..."
}
```

### Useful Commands

```bash
npm run db:studio    # Open Drizzle Studio (DB GUI) at https://local.drizzle.studio
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
```

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Response Format

**Success:**
```json
{ "success": true, "data": { ... }, "message": "Optional message" }
```

**Error:**
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `PAYMENT_REQUIRED`, `ALREADY_EXISTS`, `PAYMENT_NOT_FOUND`, `INTERNAL_ERROR`

---

### Auth Routes — `/api/v1/auth`

#### `POST /register`
Register a new user.

```json
// Request
{
  "email": "alice@example.com",
  "password": "SecurePass1",
  "username": "alice_creates",
  "role": "creator",
  "display_name": "Alice"
}

// Response 201
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "alice@example.com", "role": "creator", ... },
    "tokens": { "access_token": "...", "refresh_token": "..." }
  }
}
```

**Rules:**
- `role` is immutable after registration (prevents privilege escalation)
- `password` requires 8+ chars, 1 uppercase, 1 number

#### `POST /login`
```json
// Request
{ "email": "alice@example.com", "password": "SecurePass1" }

// Response 200
{ "success": true, "data": { "user": {...}, "tokens": { "access_token": "...", "refresh_token": "..." } } }
```

#### `POST /refresh`
```json
// Request
{ "refresh_token": "..." }

// Response 200
{ "success": true, "data": { "tokens": { "access_token": "...", "refresh_token": "..." } } }
```

#### `POST /logout`
```
Headers: Authorization: Bearer <access_token>
```
```json
// Response 200
{ "success": true, "message": "Logged out successfully" }
```

---

### User Routes — `/api/v1/users`

#### `GET /creators` _(public)_
List all active creators with DM prices.

#### `GET /creators/:username` _(public)_
Get a specific creator's public profile.

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "...",
    "username": "alice_creates",
    "display_name": "Alice",
    "bio": "Indie game developer",
    "profile_image_url": null,
    "dm_price_usd": "10.00"
  }
}
```

#### `GET /me` _(authenticated)_
Get current user's full profile.

#### `PATCH /me` _(authenticated)_
Update profile fields.

```json
// Request (creators can also update dm_price_usd)
{
  "display_name": "Alice Creates",
  "bio": "Building indie games",
  "dm_price_usd": "15.00"
}
```

---

### Payment Routes — `/api/v1/payments`

#### `POST /initiate` _(audience only)_
Initiate a payment to unlock DM access with a creator.

```json
// Request
{ "creator_id": "<uuid>", "message_preview": "Hey, I'd love to collab!" }

// Response 201
{
  "success": true,
  "data": {
    "payment_id": "<uuid>",
    "amount_usd": "10.00",
    "creator": { "id": "...", "username": "alice_creates", "display_name": "Alice" },
    "mock_payment_url": "http://localhost:3000/api/v1/payments/mock-checkout/<payment_id>"
  }
}
```

**Business Rules:**
- Amount locks in creator's current `dm_price_usd` at initiation time
- Only one active payment per audience–creator pair (prevents duplicate charges)

#### `POST /confirm/:payment_id` _(audience only)_
Confirm the payment and unlock DM access.

```json
// Request
{ "transaction_id": "optional_mock_tx_id" }

// Response 200
{
  "success": true,
  "data": {
    "payment": { "id": "...", "payment_status": "completed", "message_unlocked": true, ... },
    "dm_unlocked": true
  }
}
```

> **TODO [Solana]:** `transaction_id` will be a required Solana transaction signature in Phase 2.

#### `GET /my-payments` _(audience only)_
List all payments made by the authenticated audience user.

#### `GET /incoming` _(creator only)_
List all payments received, with audience user details.

#### `GET /mock-checkout/:payment_id` _(public)_
Simulates a payment gateway page. **Will be replaced by Solana Pay in Phase 2.**

---

### Message Routes — `/api/v1/messages`

#### `POST /send` _(any authenticated user)_
Send a message. **Enforces payment gate at service layer.**

```json
// Request
{ "receiver_id": "<uuid>", "content": "Hey Alice, love your work!" }

// Response 201
{ "success": true, "data": { "message": { "id": "...", "content": "...", "is_priority": true, ... } } }
```

**Payment gate logic:**
- Audience → Creator: a completed payment from audience to creator must exist
- Creator → Audience: creator can reply to any audience who paid them

#### `GET /conversations` _(authenticated)_
List all conversations grouped by the other user, with last message preview and unread count.

#### `GET /conversations/:user_id` _(authenticated)_
Get full message thread with a specific user. Returns 402 if no active payment.

#### `PATCH /:message_id/read` _(authenticated)_
Mark a message as read. Only the receiver can mark their messages as read.

---

### Dashboard Routes — `/api/v1/dashboard`

#### `GET /creator` _(creator only)_
Comprehensive creator dashboard.

```json
// Response 200
{
  "success": true,
  "data": {
    "total_earnings_usd": "150.00",
    "total_priority_dms": 12,
    "unread_message_count": 3,
    "recent_paying_audience": [
      {
        "audience_id": "...",
        "username": "bob",
        "display_name": "Bob",
        "paid_at": "2024-01-15T10:00:00Z",
        "amount_usd": "10.00",
        "last_message_preview": "Hey Alice, I wanted to ask...",
        "has_replied": false
      }
    ],
    "pending_dm_requests": [
      { "audience_id": "...", "username": "bob", "paid_at": "...", "amount_usd": "10.00" }
    ]
  }
}
```

#### `GET /audience` _(audience only)_
Audience dashboard with payment history and conversation status per creator.

---

## Architecture Decisions

### Why Drizzle ORM?
Drizzle provides type-safe queries without the magic of Prisma. The schema is in TypeScript, migrations are SQL, and it's Solana-ecosystem-friendly (many Solana projects use it).

### Why JWT (not sessions)?
Stateless auth scales horizontally. When we add Solana wallet auth in Phase 2, we can issue JWTs after signature verification without changing the downstream auth flow.

### Role Immutability
Once registered as `creator` or `audience`, the role cannot be changed via API. This prevents privilege escalation attacks and keeps the payment gate logic simple and auditable.

### Payment Gate at Service Layer
The payment check happens in `messages.service.ts`, not just in middleware. This defense-in-depth approach means even if middleware is bypassed, the business rule is still enforced.

### Mock Payment Flow
The mock payment service (`PAYMENT_MODE=mock`) allows full end-to-end testing of the DM unlock flow without any real payment infrastructure. Every `TODO [Solana]` comment marks exactly where blockchain calls will plug in.

---

## Roadmap to Solana

This backend is architected to be **Solana-drop-in-ready**. Here's exactly what changes in Phase 2:

### Phase 2: Solana Pay Integration

| Component | Current (Mock) | Phase 2 (Solana) |
|-----------|---------------|-----------------|
| `payment_method` | `'mock'` | `'solana'` |
| `currency` | `'USD'` | `'USDC'` or `'SOL'` |
| `transaction_id` | Mock string | Solana tx signature |
| `mock_payment_url` | localhost URL | `solana:<wallet>?amount=<n>&label=dTopMate` |
| `wallet_address` | Nullable field | Required for creators |
| Payment confirmation | Always succeeds | On-chain tx verification |

### Files to Modify

1. **`src/modules/payments/payments.service.ts`**
   - Replace `initiatePayment` → generate Solana Pay URL
   - Replace `confirmPayment` → verify tx signature with `@solana/web3.js`
   - Add `verifyOnChainPayment(txSignature, expectedAmount, creatorWallet)` function

2. **`src/db/schema/payments.ts`**
   - Add `solana` to `payment_method` enum (already done)
   - `currency` → accept `'SOL'` and `'USDC'`

3. **`src/db/schema/users.ts`**
   - Make `wallet_address` required for creators
   - Add `dm_price_sol` or `dm_price_usdc` alongside `dm_price_usd`

4. **`src/modules/auth/auth.service.ts`**
   - Add wallet signature verification as an alternative login method

5. **`src/index.ts` / `.env`**
   - Uncomment and configure `SOLANA_RPC_URL`, `PROGRAM_ID`

### New Dependencies (Phase 2)
```bash
npm install @solana/web3.js @solana/spl-token @coral-xyz/anchor
```

### Anchor Program (Phase 2)
An Anchor smart contract will manage:
- Creator registration with wallet (PDA)
- Payment escrow (optional) or direct transfer
- On-chain proof of payment for message unlocking

---

## Grant Context

**Track: Consumer Apps + Payments/Stablecoins**

dTopMate directly addresses two of Solana Foundation's priority areas:

**Consumer Apps:** This is a social/creator app targeting real end-users in India and globally. The UX is entirely Web2 — users don't need to know they're using Solana. Payments "just work" and DM access "just unlocks."

**Payments/Stablecoins:** Micropayments for DM access ($1–$20 range) are economically impossible on Ethereum (gas costs more than the payment). Solana's <$0.001 fees and USDC integration make this the only L1 where this product works.

**India-specific context:** India has 200M+ active creators across YouTube, Instagram, and Twitter/X. Creator spam and attention monetization are acute pain points. Solana's growing developer community in India + UPI-native payment familiarity creates the perfect adoption environment for a Web3-native DM monetization layer.

---

## Contributing

PRs welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## License

MIT
