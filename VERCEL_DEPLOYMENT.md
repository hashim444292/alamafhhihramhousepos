# Vercel Deployment Guide - Al-Afhhihram House POS

This guide details how to deploy the **Al-Afhhihram House POS** to [Vercel](https://vercel.com).

---

## ⚠️ Important Note About Databases on Serverless (Vercel)

Vercel functions run in a **serverless, stateless environment**. 
- Local SQLite files (`dev.db`) **cannot persist writes across serverless executions**. 
- For production on Vercel, connect a cloud PostgreSQL database (such as **Vercel Postgres / Neon**, **Supabase**, or **Aiven**).

---

## Step 1: Push Code to GitHub

1. Create a repository on your GitHub account (e.g. `al-afhhihram-house-pos`).
2. Run the following commands in the project folder:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/al-afhhihram-house-pos.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Set Up a Free Cloud Database

You can get a free managed PostgreSQL database in under 2 minutes:
- **Option A (Vercel Marketplace / Neon)**: In Vercel, navigate to the **Storage** tab and click **Create Database** → **Neon / Postgres**.
- **Option B (Supabase)**: Create a project at [supabase.com](https://supabase.com) and copy your connection string (`postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`).

If using PostgreSQL, update `prisma/schema.prisma` datasource:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
And run:
```bash
npx prisma db push
```

---

## Step 3: Deploy on Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new).
2. Sign in with GitHub and import the `al-afhhihram-house-pos` repository.
3. In the **Environment Variables** section, add the required keys:

| Environment Variable | Recommended Value |
|---|---|
| `DATABASE_URL` | Your Cloud PostgreSQL connection string (or Turso libsql url) |
| `DATABASE_PROVIDER` | `postgresql` |
| `JWT_SECRET` | Generate any random 32+ char string |
| `NEXT_PUBLIC_APP_NAME` | `Al-Afhhihram House POS` |
| `NEXT_PUBLIC_STORE_NAME` | `Al-Afhhihram House` |
| `NEXT_PUBLIC_STORE_TAGLINE` | `Premium Ihram Sets, Islamic Clothing & Hajj Accessories` |
| `NEXT_PUBLIC_STORE_ADDRESS` | `Shop #12, Madinah Market, Urdu Bazar, Lahore / Karachi, Pakistan` |
| `NEXT_PUBLIC_STORE_PHONE` | `+92 300 1234567` |
| `NEXT_PUBLIC_STORE_TAX_NUMBER` | `STRN-12345678-9` |
| `NEXT_PUBLIC_CURRENCY_SYMBOL` | `Rs.` |
| `NEXT_PUBLIC_CURRENCY_CODE` | `PKR` |
| `NEXT_PUBLIC_DEFAULT_RECEIPT_WIDTH` | `80mm` |

4. Click **Deploy**. Vercel will automatically run `npm run build` (including `prisma generate`) and make your POS live on `https://your-project.vercel.app`.

---

## Step 4: Seed Initial Data (Optional)

Once your database is connected, push schema and seed the initial catalog and admin/cashier accounts:
```bash
DATABASE_URL="your-production-db-url" npx prisma db push
DATABASE_URL="your-production-db-url" npm run db:seed
```
