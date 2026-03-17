# 🚀 Deployment Guide: Vercel + Railway

## Overview
- **Frontend**: Vercel (reachout.vercel.app)
- **Backend**: Railway (https://api.railway.app)
- **Free tier** supports both

---

## ✅ Pre-Deployment Checklist

- [ ] All APIs working locally (search, generate, send)
- [ ] `.env` has all 4 API keys filled
- [ ] Tests pass locally
- [ ] Git repository created (if not using manual upload)

---

## 🔧 PART 1: Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Click "Start Project"
3. Sign up with GitHub (easiest) or email

### Step 2: Deploy Code
```bash
# Option A: Push code to GitHub (recommended)
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main

# Then in Railway: New Project → Import from GitHub
```

OR

```bash
# Option B: Use Railway CLI (manual)
npm i -g @railway/cli
railway login
railway init
railway up
```

### Step 3: Add Environment Variables in Railway
In Railway dashboard → Variables → Add:
```
HUNTER_API_KEY=your_hunter_api_key_here
RAPIDAPI_KEY=your_rapidapi_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDER_EMAIL=your_sender_email@example.com
```

### Step 4: Get Backend URL
- In Railway dashboard, find the Public URL (e.g., `https://reachout-production.up.railway.app`)
- Copy this URL for Step 7

---

## 🎨 PART 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub (recommended) or email

### Step 2: Connect Repository
1. Click "Add New Project"
2. Import GitHub repo (or upload folder manually)
3. Framework preset: **Vite**
4. Root directory: `.` (root)

### Step 3: Add Environment Variables
In Vercel dashboard → Settings → Environment Variables:
```
VITE_API_URL=https://reachout-production.up.railway.app
```

### Step 4: Deploy
1. Click "Deploy"
2. Wait for build to complete (2-3 mins)
3. Get your frontend URL (e.g., `https://reachout.vercel.app`)

---

## 🔗 PART 3: Update CORS Settings

Go back to Railway backend settings and update main.py:

```python
allow_origins=[
    "https://reachout.vercel.app",  # Your Vercel domain
    "https://your-custom-domain.com",  # If you have custom domain
]
```

Redeploy backend (Railway auto-redeploys on code push)

---

## ✨ PART 4: Update Frontend .env Configuration

Create `.env.production` file:
```
VITE_API_URL=https://reachout-production.up.railway.app
```

Then in your build commands (Vercel will use this automatically)

---

## ✅ Testing Production

1. Open https://reachout.vercel.app
2. Search for "Google"
3. Should see 10 contacts pulled from Hunter.io
4. Continue through entire workflow
5. Test email generation and sending

---

## 🎯 Quick Troubleshooting

**CORS Error?**
- Update `allow_origins` in main.py with your Vercel URL
- Redeploy backend

**No contacts loading?**
- Check Railway environment variables are set
- Verify API keys in Railway dashboard match .env

**Slow performance?**
- Railway free tier has rate limits
- Consider upgrading for production use

---

## 📊 Cost Estimate (Free Tier)
- **Vercel**: Free forever
- **Railway**: $5/month (~5 GB RAM included, free tier limited)
- **Total**: ~$5/month (can scale if needed)

---

## 🚀 Next Steps
1. Double-check all 4 API keys are in Railway
2. Deploy backend first, get URL
3. Deploy frontend next, add backend URL
4. Test entire workflow
5. Monitor logs for errors

Questions? Check Railway/Vercel docs or reach out!
