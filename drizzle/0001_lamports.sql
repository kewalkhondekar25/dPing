-- Users: add dm_price_lamports (Solana lamports), migrate from dm_price_usd, drop dm_price_usd
ALTER TABLE "users" ADD COLUMN "dm_price_lamports" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "users" SET "dm_price_lamports" = (ROUND("dm_price_usd"::numeric * 1000000000))::bigint WHERE "dm_price_usd" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "dm_price_usd";
--> statement-breakpoint

-- Payments: add amount_lamports, migrate from amount_usd, drop amount_usd; set currency default to SOL
ALTER TABLE "payments" ADD COLUMN "amount_lamports" bigint;
--> statement-breakpoint
UPDATE "payments" SET "amount_lamports" = (ROUND("amount_usd"::numeric * 1000000000))::bigint WHERE "amount_usd" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "amount_lamports" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "amount_usd";
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'SOL';
