ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'SOL';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dm_price_lamports" bigint DEFAULT 5000000000 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "amount_lamports" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "dm_price_usd";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "amount_usd";