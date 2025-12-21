# Vercel Deployment Guide

## Common 404 Error Fixes

### 1. Project Root Directory
In Vercel project settings, make sure the **Root Directory** is set to:
```
shubh-hyundai-dashboard
```

If your Vercel project is in the root `Automobile` folder, you need to:
- Go to Vercel Dashboard → Your Project → Settings → General
- Set **Root Directory** to `shubh-hyundai-dashboard`
- Save and redeploy

### 2. Environment Variables
Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://auto-mobile-mblq.vercel.app
```

### 3. Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (or `npm run build` with legacy peer deps)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install --legacy-peer-deps`

### 4. Node Version
Make sure Node.js version is set to 18.x or 20.x in Vercel settings.

### 5. Common Issues

#### Issue: 404 on all routes
**Solution**: Check that Root Directory is correctly set to `shubh-hyundai-dashboard`

#### Issue: Build fails
**Solution**: Make sure `NEXT_PUBLIC_API_URL` is set in environment variables

#### Issue: API calls fail
**Solution**: Verify the backend URL is correct and backend is deployed

### 6. Deployment Steps

1. **Connect Repository**: Link your GitHub/GitLab/Bitbucket repo to Vercel
2. **Set Root Directory**: `shubh-hyundai-dashboard`
3. **Add Environment Variables**: `NEXT_PUBLIC_API_URL`
4. **Deploy**: Click Deploy

### 7. Verify Deployment

After deployment, check:
- ✅ Build logs show successful build
- ✅ All routes are accessible (not 404)
- ✅ API calls work (check browser console)
- ✅ Login page loads correctly

