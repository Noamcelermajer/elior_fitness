# Railway Custom Domain Setup

## Port Configuration

**Your application is listening on port: `8000`**

The app uses the `PORT` environment variable provided by Railway, defaulting to `8000` if not set. Railway will automatically provide this variable.

## Steps to Add Custom Domain

1. **Deploy your service** - Make sure it's running successfully
2. **Go to Service Settings** → **Networking** → **Public Networking**
3. **Click "+ Custom Domain"**
4. **Enter your domain** (e.g., `yourdomain.com`)
5. **Select Target Port**: When prompted, select **`8000`** from the list
   - Railway should auto-detect this port
   - If you see a list of ports, choose `8000`
6. **Copy the CNAME value** Railway provides (e.g., `abc123.up.railway.app`)
7. **Add CNAME record in your DNS provider**:
   - **Name/Record**: `@` (for root domain) or `www` (for www subdomain)
   - **Target/Value**: The CNAME value from Railway (e.g., `abc123.up.railway.app`)
   - **TTL**: Auto or 3600
8. **Wait for verification** - Railway will verify your DNS (can take a few minutes to 72 hours)
9. **SSL Certificate** - Railway automatically issues a Let's Encrypt certificate once verified

## Troubleshooting

### Domain Not Showing Up

1. **Check if service is deployed and running**
   - Go to Railway dashboard → Your service → Logs
   - Verify the app started successfully
   - Look for: `Starting FastAPI on port 8000...`

2. **Verify PORT is set correctly**
   - Railway automatically provides `PORT` variable
   - Your app listens on `0.0.0.0:$PORT` (which is correct)
   - Default port is `8000`

3. **Check DNS propagation**
   - Use `nslookup yourdomain.com` or `dig yourdomain.com`
   - Verify the CNAME record points to Railway's domain
   - DNS changes can take up to 72 hours

4. **Verify Target Port in Railway**
   - Go to Service Settings → Networking → Your custom domain
   - Click the edit icon (pencil) next to your domain
   - Ensure the target port is set to **`8000`**

5. **Check Railway logs**
   - Look for any errors related to domain verification
   - Check if the service is listening on the correct port

### Common Issues

- **"Domain not verified"**: Wait longer for DNS propagation, or check CNAME record is correct
- **"Port not detected"**: Make sure the service is running and listening on port 8000
- **"ERR_TOO_MANY_REDIRECTS"**: If using Cloudflare, set SSL/TLS to "Full" (not "Full Strict")

## Port Information

- **Application Port**: `8000`
- **Railway PORT Variable**: Automatically provided (usually `8000`)
- **Target Port for Custom Domain**: `8000`

The application is configured to listen on `0.0.0.0:$PORT` where `PORT` is provided by Railway. This ensures Railway can route traffic correctly to your application.

