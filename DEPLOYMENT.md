## Deployment Guide

### Frontend (Vercel)

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - Add Environment Variable:
     - `VITE_API_URL`: (leave empty for now, will update after backend deploys)
   - Click "Deploy"

3. **After deployment**, copy your Vercel URL (e.g., `https://your-app.vercel.app`)

---

### Backend (Render)

1. **Deploy to Render**:
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `formula-intelligence-backend`
     - **Runtime**: Python 3
     - **Root Directory**: `backend`
     - **Build Command**: `chmod +x build.sh && ./build.sh`
     - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   
2. **Add Environment Variables**:
   ```
   DEBUG=false
   LOG_LEVEL=INFO
   MAX_WORKERS=4
   ENABLE_CACHE=false
   CORS_ORIGINS=["https://your-frontend-app.vercel.app"]
   ```

3. **Optional - Add Redis** (for caching):
   - Create Redis instance on Render
   - Add to backend:
     ```
     ENABLE_CACHE=true
     REDIS_HOST=<your-redis-host>
     REDIS_PORT=6379
     ```

4. **After deployment**, copy your Render URL (e.g., `https://your-backend.onrender.com`)

---

### Update Frontend with Backend URL

1. Go back to Vercel
2. Go to your project → Settings → Environment Variables
3. Update `VITE_API_URL` to your Render backend URL
4. Redeploy frontend

---

### Update Backend CORS

1. Go to Render → your backend service → Environment
2. Update `CORS_ORIGINS` to include your Vercel URL:
   ```
   ["https://your-frontend-app.vercel.app","http://localhost:3000"]
   ```
3. Redeploy

---

### Test Deployment

1. Visit your Vercel URL
2. Upload the sample Excel file
3. Verify analysis works

---

### Quick Deploy Commands

**Using Vercel CLI** (optional):
```bash
cd frontend
npm install -g vercel
vercel --prod
```

**Using Render CLI** (optional):
```bash
# Install Render CLI
curl -L https://render.com/install.sh | sh

# Deploy
render deploy
```

---

### Production Checklist

✅ Frontend deployed to Vercel
✅ Backend deployed to Render  
✅ Environment variables configured
✅ CORS origins updated
✅ Health check passing
✅ File upload working
✅ Sample Excel test successful

---

### Troubleshooting

**Build fails on Render?**
- Check build logs for Rust installation errors
- Verify `build.sh` has execute permissions
- Try manually installing dependencies

**CORS errors?**
- Verify `CORS_ORIGINS` includes your Vercel URL
- Make sure URL doesn't have trailing slash

**Upload not working?**
- Check file size limits (100MB default)
- Verify uploads directory exists
- Check Render logs for errors
