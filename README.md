# dPing — Priority DMs Powered by Solana Micropayments

> **Status:** Phase 1 — Web2 Backend (Solana-ready architecture)
> **Grant Target:** Solana Foundation India Grant — Consumer Apps & Payments/Stablecoins tracks

A decentralized creator monetization platform where audiences pay creators to unlock direct messaging access. Built so every creator can monetize their attention, and every message is guaranteed to be worth reading.

---

## Project Vision

**The Problem:** Creators on social platforms are drowning in spam, bot messages, and low-quality DMs. Their attention is worth money, but there's no mechanism to enforce that.

**The Solution:** dPing introduces a payment gate for DMs. Audience members pay a creator's set price (in SOL) to unlock direct messaging access. Creators only see messages from people who genuinely value their time.

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
cd dping
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
  "service": "dping API",
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

### High-Level Routes

The backend exposes RESTful routes grouped by feature:

- **Auth**: registration, login, refresh, logout
- **Users**: creator discovery and profile management
- **Payments**: initiate and confirm DM unlock payments
- **Messages**: send messages and fetch conversations
- **Dashboard**: creator and audience analytics

For the latest detailed endpoints and request/response shapes, refer to the source code under `src/modules/*` or your API client collection (e.g. Postman/Bruno/Insomnia).

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
| `mock_payment_url` | localhost URL | `solana:<wallet>?amount=<n>&label=dping` |
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

dPing directly addresses two of Solana Foundation's priority areas:

**Consumer Apps:** This is a social/creator app targeting real end-users in India and globally. The UX is entirely Web2 — users don't need to know they're using Solana. Payments "just work" and DM access "just unlocks."

**Payments/Stablecoins:** Micropayments for DM access ($1–$20 range) are economically impossible on Ethereum (gas costs more than the payment). Solana's <$0.001 fees and USDC integration make this the only L1 where this product works.

**India-specific context:** India has 200M+ active creators across YouTube, Instagram, and Twitter/X. Creator spam and attention monetization are acute pain points. Solana's growing developer community in India + UPI-native payment familiarity creates the perfect adoption environment for a Web3-native DM monetization layer.

---

## Contributing

PRs welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## License

MIT
