# 🚀 Quick Deployment Guide - Elior Fitness

## ⚡ **Fastest Path to Production**

### **Option 1: Railway (Recommended - 5 minutes)**

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and link
railway login
railway link

# 3. Set environment variables
railway variables set ENVIRONMENT=production
railway variables set JWT_SECRET=$(openssl rand -hex 32)
# Note: CORS_ORIGINS will auto-detect from Railway domain

# 4. Deploy
railway up

# 5. Get your URL
railway domain
```

**Cost:** $5/month (Hobby plan) or free tier (500 hours/month)

**Time to deploy:** ~5 minutes

---

### **Option 2: Fly.io (Cheapest - 10 minutes)**

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Launch (first time only)
fly launch

# 4. Create volume for database
fly volumes create elior_data --size 2

# 5. Set secrets
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set ENVIRONMENT=production

# 6. Deploy
fly deploy
```

**Cost:** ~$2/month (pay-as-you-go)

**Time to deploy:** ~10 minutes

---

### **Option 3: Render (Automatic Deployments - 5 minutes)**

1. Go to https://render.com
2. Connect your GitHub repository
3. Render auto-detects `render.yaml`
4. Set environment variables in dashboard:
   - `JWT_SECRET` (generate with `openssl rand -hex 32`)
   - `ENVIRONMENT=production`
5. Click "Deploy"

**Cost:** $7/month (Starter plan) or free tier (spins down)

**Time to deploy:** ~5 minutes

---

## 🔑 **Required Environment Variables**

Set these in your hosting platform's dashboard:

```bash
ENVIRONMENT=production
JWT_SECRET=<generate-secure-secret>  # Use: openssl rand -hex 32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_PATH=/app/data/elior_fitness.db
DATABASE_URL=sqlite:////app/data/elior_fitness.db
LOG_LEVEL=INFO
PORT=8000
# CORS_ORIGINS will auto-detect on Railway/Render
```

---

## ✅ **Post-Deployment Checklist**

1. **Test Health Endpoint:**
   ```bash
   curl https://your-app-url/health
   ```

2. **Test API:**
   ```bash
   curl https://your-app-url/api/test
   ```

3. **Test Frontend:**
   - Open `https://your-app-url` in browser
   - Should see login page

4. **Test Login:**
   - Use default test users:
     - Admin: `admin@elior.com` / `admin123`
     - Trainer: `trainer@elior.com` / `trainer123`
     - Client: `client@elior.com` / `client123`

5. **Check Logs:**
   - Railway: `railway logs`
   - Fly.io: `fly logs`
   - Render: Dashboard → Logs

---

## 🐛 **Troubleshooting**

### **Frontend Not Loading:**
- Check if static files are built: `ls static/` in container
- Verify Dockerfile copied frontend build correctly
- Check logs for errors

### **Database Errors:**
- Ensure persistent volume is mounted (Fly.io: `fly volumes list`)
- Check database file permissions
- Verify `DATABASE_PATH` environment variable

### **CORS Errors:**
- Check `CORS_ORIGINS` environment variable
- Verify domain matches your deployment URL
- Check browser console for specific CORS error

### **WebSocket Not Working:**
- Verify platform supports WebSockets (Railway ✅, Fly.io ✅, Render ✅)
- Check if `/api/ws` endpoint is accessible
- Test with: `wscat -c wss://your-app-url/api/ws`

---

## 📊 **Cost Comparison**

| Provider | Monthly Cost | Setup Time | Best For |
|----------|--------------|------------|----------|
| **Fly.io** | **~$2** | 10 min | Cheapest option |
| **Railway** | **$5** | 5 min | Easiest setup |
| **Render** | **$7** | 5 min | Auto-deployments |

---

## 🎯 **Recommendation**

**For fastest deployment:** Use **Railway** - already configured, one command deploy.

**For cheapest option:** Use **Fly.io** - ~$2/month, requires `fly.toml` (already created).

**For automatic deployments:** Use **Render** - auto-deploys on git push.

All three options work perfectly with your optimized application! 🚀

