# Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Stripe account
- OpenAI API key
- Google OAuth credentials (optional)
- Resend/SMTP account for email

---

## 1. Environment Setup

Copy and fill in all variables:
```bash
cp .env.example .env
```

Required:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Generate: `openssl rand -base64 32`
- `OPENAI_API_KEY` — From platform.openai.com
- `STRIPE_SECRET_KEY` — From stripe.com/dashboard
- `STRIPE_WEBHOOK_SECRET` — From Stripe webhook settings

---

## 2. Database Setup

```bash
# Install dependencies
npm install

# Push schema to database
npm run db:push

# Seed with demo data (optional)
npm run db:seed
```

---

## 3. Stripe Setup

### Create Products
```bash
# In Stripe Dashboard, create 3 products:
# 1. ContentForge Starter — $29/month recurring
# 2. ContentForge Pro — $79/month recurring  
# 3. ContentForge Agency — $199/month recurring
```

Add the Price IDs to `.env`:
```
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_AGENCY_PRICE_ID=price_xxx
```

### Configure Webhook
Point to: `https://your-domain.com/api/webhooks/stripe`

Events to enable:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## 4. Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Or use: vercel env add <NAME>
```

Post-deployment:
1. Set `NEXTAUTH_URL` to your production domain
2. Add production domain to Google OAuth allowed origins
3. Update Stripe webhook URL to production endpoint

---

## 5. Docker Deployment

```bash
# Build and run
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

---

## 6. Local Development

```bash
npm install
npm run db:push
npm run dev
```

Visit: http://localhost:3000

---

## Monthly Maintenance

The article usage counter resets monthly. Set up a cron job:

```bash
# Add to cron (runs 1st of each month)
0 0 1 * * curl -X POST https://your-domain.com/api/cron/reset-usage \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use Vercel Cron Jobs in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/reset-usage",
    "schedule": "0 0 1 * *"
  }]
}
```
