# LeadFlow AI — Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PRODUCTION                           │
│                                                             │
│  Vercel (Next.js App)  ←→  Railway (PostgreSQL)             │
│         ↓                         ↑                         │
│    Clerk (Auth)              Prisma ORM                      │
│    Stripe (Billing)                                          │
│    OpenAI (AI)                                               │
│    Resend (Email)                                            │
│    Twilio (SMS)                                              │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Database (Railway)

1. Create a Railway account at railway.app
2. New Project → Add Service → Database → PostgreSQL
3. Copy the `DATABASE_URL` from Railway settings
4. For `DIRECT_URL`, use the same connection string

```bash
# Test connection locally
DATABASE_URL="postgresql://..." npx prisma db push
```

## Step 2: Authentication (Clerk)

1. Create a Clerk account at clerk.com
2. Create a new application
3. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
4. In Clerk dashboard, set redirect URLs:
   - After sign-in: `/dashboard`
   - After sign-up: `/onboarding`

## Step 3: Stripe Setup

1. Create a Stripe account at stripe.com
2. Go to Products → Add Product for each plan:
   - Starter: $49/mo, $39/mo (yearly)
   - Growth: $149/mo, $119/mo (yearly)
   - Pro: $299/mo, $239/mo (yearly)
3. Copy price IDs to env vars
4. Add webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
5. Subscribe to events: `customer.subscription.*`, `invoice.payment_failed`
6. Copy webhook signing secret

## Step 4: OpenAI

1. Create an OpenAI account at platform.openai.com
2. Create an API key with appropriate limits
3. Recommended model: `gpt-4o-mini` (cost-efficient, fast)
4. Set spending limits ($50/mo for early stage)

## Step 5: Email (Resend)

1. Create a Resend account at resend.com
2. Add and verify your sending domain
3. Create an API key
4. Test sending: `curl -X POST https://api.resend.com/emails ...`

## Step 6: SMS (Twilio)

1. Create a Twilio account at twilio.com
2. Buy a local phone number ($1/month)
3. Copy Account SID, Auth Token, and phone number

## Step 7: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or connect GitHub repo in Vercel dashboard for auto-deploy
```

Configure environment variables in Vercel dashboard:
- All variables from `.env.example`

## Step 8: Run Database Migrations

```bash
# In Vercel environment
npx prisma migrate deploy

# Or via Railway CLI
railway run npx prisma migrate deploy
```

## Step 9: Seed Demo Data (Optional)

```bash
DATABASE_URL="your_prod_url" npm run db:seed
```

## Step 10: Configure Webhook URL in Stripe

After deploying, add this webhook URL in Stripe:
```
https://yourdomain.vercel.app/api/webhooks/stripe
```

---

## Local Development

```bash
# Clone and install
git clone https://github.com/your-org/leadflow-ai
cd leadflow-ai
npm install

# Setup env
cp .env.example .env
# Fill in your env variables

# Start database
docker compose -f docker/docker-compose.yml up db -d

# Push schema
npx prisma db push

# Seed data
npm run db:seed

# Start dev server
npm run dev
```

Visit http://localhost:3000

---

## Docker Production Deployment

```bash
# Build and run with Docker Compose
cd docker
docker compose up -d

# Run migrations
docker compose run --rm migrate

# View logs
docker compose logs -f app
```

---

## Cost Estimates (Monthly)

| Service | Cost |
|---------|------|
| Vercel Pro | $20/mo |
| Railway (PostgreSQL, 1GB) | $5/mo |
| Clerk (up to 10k MAU free) | $0-25/mo |
| Resend (up to 3k/mo free) | $0-20/mo |
| Twilio (per SMS ~$0.0075) | $10-50/mo |
| OpenAI (gpt-4o-mini) | $5-30/mo |
| **Total** | **~$40-150/mo** |

With $49/month plan pricing, you break even at **1-4 paying customers**.

---

## Monitoring & Observability

Recommended additions for production:
- **Error tracking**: Sentry (free tier)
- **Analytics**: Plausible or PostHog (privacy-friendly)
- **Uptime**: BetterUptime or UptimeRobot (free)
- **Log management**: Axiom or Logtail

---

## Scaling Checklist

When you hit $5k MRR:
- [ ] Add Redis (Upstash) for rate limiting and caching
- [ ] Add background job queue (QStash or BullMQ)
- [ ] Set up database read replicas
- [ ] Add CDN for static assets (Cloudflare)
- [ ] Implement proper error logging (Sentry)
- [ ] Add feature flags (PostHog)
