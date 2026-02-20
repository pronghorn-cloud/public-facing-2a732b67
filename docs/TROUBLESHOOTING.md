# Troubleshooting Guide

## Common Issues and Solutions

### Development Server Issues

#### Hot Reload and Signal Handling

**Implementation:** The template uses Node.js native `--watch` mode with `--import tsx` for development. This ensures proper signal handling and graceful shutdown while maintaining hot reload functionality.

**Why Not tsx watch?** When `tsx watch` is run via `npm run dev`, npm v10.3.0+ intercepts SIGINT/SIGTERM signals and force-kills the tsx process before graceful shutdown can complete. Node.js native watch mode eliminates this issue by providing a direct signal path to the application.

**Expected Behavior:** After pressing Ctrl+C once, you should see:
```
SIGINT received, starting graceful shutdown...
HTTP server closed (no longer accepting connections)
Graceful shutdown complete
```

The port should be freed immediately, allowing you to restart the server without any "EADDRINUSE" errors.

**If Port 3000 is Still Occupied:**

This indicates an unexpected issue. To diagnose:

```bash
# On Windows:
netstat -ano | findstr :3000
taskkill /F /PID <process_id>

# On Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

Then report the issue, as graceful shutdown should work correctly in both development and production.

---

### Redis Connection Issues

#### Error: "Failed to connect to Redis"

**Cause:** Redis server is unreachable.

**Solution:**

1. **Check Redis is running:**
   ```bash
   # Docker Redis
   docker ps | grep redis

   # Local Redis
   redis-cli ping
   # Should return: PONG
   ```

2. **Verify REDIS_URL:**
   ```bash
   # In .env
   REDIS_URL=redis://localhost:6379
   ```

3. **For Azure Cache for Redis:**
   ```bash
   # Ensure TLS port and proper URL scheme
   REDIS_URL=rediss://:{{ACCESS_KEY}}@{{HOSTNAME}}.redis.cache.windows.net:6380
   ```

4. **Check network connectivity:**
   - Firewall rules (Azure: `az redis firewall-rules list`)
   - VPN connection (if required)
   - Private endpoint configuration

#### Error: "REDIS_HOST is required when REDIS_AUTH_MODE=entraid"

**Cause:** Entra ID mode requires explicit host configuration (not a URL).

**Solution:**
```bash
# In .env
REDIS_AUTH_MODE=entraid
REDIS_HOST=myredis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_USERNAME=<managed-identity-object-id>
```

#### Redis "WRONGPASS" or authentication errors

**Cause:** Incorrect access key or expired Entra ID token.

**Solution:**

1. **Access key mode:** Verify the key in REDIS_URL matches the current primary or secondary key:
   ```bash
   az redis list-keys --resource-group $RG --name $REDIS_NAME
   ```

2. **Entra ID mode:** Verify:
   - `REDIS_USERNAME` matches the managed identity's **Object ID** (not Client ID)
   - The managed identity has **Data Owner** or **Data Contributor** role in Redis **Data Access Configuration**
   - Azure credentials are available (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET` or managed identity)

#### Redis max reconnect attempts reached

**Cause:** Redis has been unreachable for extended time (10 retries with exponential backoff).

**Solution:**
1. Check Redis server is running and healthy
2. Check network path between API container and Redis
3. Restart the API server after resolving the underlying connectivity issue

---

### TypeScript Compilation Errors

#### Error: Pre-existing TypeScript errors preventing build

**Solution:** Run `npm run typecheck` to see all errors. Common fixes:

1. **Add type declarations** for Express extensions
2. **Fix unused variables** — prefix with underscore: `_user`, `_res`

---

### Session Storage Issues

#### Sessions not persisting across restarts

**Cause:** Using memory session store (default).

**Solution:**

```bash
# In .env — switch to Redis
SESSION_STORE=redis
REDIS_URL=redis://localhost:6379
```

Then restart the server. Sessions will now persist across server restarts.

#### Sessions not shared across replicas

**Cause:** Using memory session store. Each server instance has its own in-memory store.

**Solution:** Use Redis session store (`SESSION_STORE=redis`). Redis is shared across all server instances.

#### Reverting to memory session store

Set `SESSION_STORE=memory` (or remove the variable) and restart the server. No Redis connection is needed.

---

### Health Check Failures

#### Health check returns 503 (Service Unavailable)

**Cause:** Redis connection failed (when `SESSION_STORE=redis`).

**Check:**
```bash
curl http://localhost:3000/api/v1/health
```

**Expected response (healthy):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "redis": "connected",
    "timestamp": "...",
    "environment": "development",
    "version": "1.0.0"
  }
}
```

**Degraded response (Redis disconnected):**
```json
{
  "success": false,
  "data": {
    "status": "degraded",
    "redis": "disconnected"
  }
}
```

**Solution:**
1. Check Redis is running and accessible
2. Verify `REDIS_URL` or `REDIS_HOST` configuration
3. Check Redis server logs for connection errors

#### Health check shows "redis": "not_configured"

This is expected when using `SESSION_STORE=memory` (the default). The health endpoint returns 200 with `"status": "healthy"`.

---

### Docker Issues

#### Error: "port is already allocated"

**Solution:**
```bash
# Stop all containers
docker-compose down

# Remove orphaned containers
docker-compose down --remove-orphans

# Start fresh
docker-compose up -d
```

---

### Authentication Issues

#### SAML assertion validation failed

**Solution:**
1. Verify `SAML_CERT` contains the correct IdP public certificate
2. Check certificate is in PEM format
3. Ensure certificate hasn't expired
4. Verify `SAML_WANT_ASSERTIONS_SIGNED=true` matches IdP configuration

#### Sessions lost after authentication

**Solution:**
1. Check `SESSION_SECRET` is set and consistent across restarts
2. Ensure `CORS_ORIGIN` matches `WEB_URL`
3. Check browser allows cookies (not in incognito/private mode)
4. Verify cookie settings: `secure: true` requires HTTPS

---

### CORS Issues

#### Error: "blocked by CORS policy"

**Solution:**
1. Ensure `CORS_ORIGIN` matches the exact frontend URL (including protocol and port)
2. Verify API and web app origins are consistent

---

## Getting Help

### Check Logs

**Development:**
```bash
npm run dev
# Logs appear in console (pretty-printed)
```

**Production:**
```bash
# Docker
docker-compose logs -f api

# Kubernetes
kubectl logs -f deployment/api
```

### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=debug
```

### Verify Configuration

```bash
# Check health endpoint
curl http://localhost:3000/api/v1/health

# Test Redis connectivity (if configured)
redis-cli -h localhost -p 6379 ping
```

### Report Issues

Gather diagnostic information:
```bash
node --version
npm --version
curl http://localhost:3000/api/v1/health
```

Create an issue with: error message, steps to reproduce, environment details, and sanitized logs.

---

**Last Updated:** February 19, 2026
