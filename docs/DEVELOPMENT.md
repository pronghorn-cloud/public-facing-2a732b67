# Development Guide

## Prerequisites

Before starting development, ensure you have the following installed:

- **Node.js** 24.x or higher ([nodejs.org](https://nodejs.org/))
- **npm** 10.x or higher (included with Node.js)
- **Git** for version control
- **VS Code** (recommended) with extensions:
  - Vue - Official (Vue Language Features)
  - TypeScript Vue Plugin (Volar)
  - ESLint
  - Prettier

**Optional**:
- **Docker Desktop** for containerized development ([docker.com](https://www.docker.com/products/docker-desktop))
- **Redis** for testing Redis session store locally ([redis.io](https://redis.io/))

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd aim-vue-node-template

# Install all dependencies (monorepo)
npm install
```

**What happens**:
- Installs dependencies for all workspaces (apps/web, apps/api, packages/*)
- Sets up Git hooks via Husky (pre-commit linting)
- Links workspace packages internally

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings (or use defaults)
nano .env
```

**Minimal required configuration** (defaults work out of the box):
```bash
# Session secret (development only - generate new for production)
SESSION_SECRET=dev-secret-change-in-production-minimum-32-characters

# Auth driver (mock for local dev)
AUTH_DRIVER=mock

# Frontend origin
CORS_ORIGIN=http://localhost:5173
```

The default configuration uses **in-memory session storage**, which is sufficient for local development. No external services are required.

### 3. Start Development Servers

**Option A: Run both servers** (recommended for full-stack development):

```bash
npm run dev
```

This starts:
- **API**: http://localhost:3000
- **Web**: http://localhost:5173

**Option B: Run servers separately** (better signal handling on Windows):

```bash
# Terminal 1: API server
npm run dev:api

# Terminal 2: Web server
npm run dev:web
```

### 4. Verify Setup

Open your browser:
- **Web App**: http://localhost:5173
- **API Health Check**: http://localhost:3000/api/v1/health
- **API Info**: http://localhost:3000/api/v1/info

Expected health check response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "redis": "not_configured",
    "timestamp": "2026-02-19T...",
    "environment": "development",
    "version": "1.0.0"
  }
}
```

### 5. (Optional) Test with Redis

To test Redis session storage locally:

**Option A: Docker Redis**
```bash
docker run -d --name redis-dev -p 6379:6379 redis:7-alpine
```

**Option B: Local Redis installation**
```bash
# macOS
brew install redis && redis-server

# Linux
sudo apt install redis-server && redis-server
```

Then configure your `.env`:
```bash
SESSION_STORE=redis
REDIS_URL=redis://localhost:6379
# REDIS_AUTH_MODE defaults to accesskey
```

Restart the API server. The health check should now show `"redis": "connected"`.

To revert to memory: set `SESSION_STORE=memory` (or remove the variable) and restart.

## Development Workflow

### Project Structure

```
aim-vue-node-template/
├── apps/
│   ├── web/              # Vue 3 frontend
│   │   ├── src/
│   │   │   ├── components/   # Reusable Vue components
│   │   │   ├── views/        # Page components
│   │   │   ├── router/       # Vue Router config
│   │   │   ├── stores/       # Pinia state management
│   │   │   ├── assets/       # Static assets
│   │   │   ├── types/        # TypeScript types
│   │   │   └── main.ts       # Entry point
│   │   ├── public/       # Public static files
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/              # Express backend
│       ├── src/
│       │   ├── routes/       # API route definitions
│       │   ├── controllers/  # Request handlers
│       │   ├── services/     # Business logic
│       │   ├── middleware/   # Express middleware
│       │   ├── config/       # Redis configuration
│       │   ├── types/        # TypeScript types
│       │   ├── utils/        # Utility functions
│       │   ├── app.ts        # Express app setup
│       │   └── server.ts     # Server entry point
│       ├── tests/        # API tests
│       └── package.json
│
├── packages/
│   ├── shared/           # Shared types and schemas
│   ├── config/           # Configuration validation (Zod)
│   └── auth/             # Authentication drivers
│
├── docker/               # Docker configuration
├── docs/                 # Documentation
├── .env                  # Local environment variables (git-ignored)
├── .env.example          # Environment template
├── package.json          # Root package.json (workspaces)
└── tsconfig.base.json    # Shared TypeScript config
```

### Making Changes

#### Frontend Development

**1. Create a new component**:

```bash
# Create component file
touch apps/web/src/components/UserCard.vue
```

```vue
<!-- apps/web/src/components/UserCard.vue -->
<template>
  <goa-card width="400px" elevation="2">
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
    <GoabButton type="primary" @click="handleEdit">
      Edit User
    </GoabButton>
  </goa-card>
</template>

<script setup lang="ts">
import { GoabButton } from '@/components/goa'

interface Props {
  user: {
    id: string
    name: string
    email: string
  }
}

const props = defineProps<Props>()

function handleEdit() {
  console.log('Editing user:', props.user.id)
}
</script>
```

**2. Create a new view**:

```bash
# Create view file
touch apps/web/src/views/UsersView.vue
```

```vue
<!-- apps/web/src/views/UsersView.vue -->
<template>
  <AppLayout>
    <h1>Users</h1>
    <div v-for="user in users" :key="user.id">
      <UserCard :user="user" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import UserCard from '@/components/UserCard.vue'

const users = ref([])

onMounted(async () => {
  const response = await fetch('/api/v1/users')
  users.value = await response.json()
})
</script>
```

**3. Add route**:

```typescript
// apps/web/src/router/index.ts
import UsersView from '@/views/UsersView.vue'

const router = createRouter({
  routes: [
    // ... existing routes
    {
      path: '/users',
      name: 'users',
      component: UsersView,
      meta: { requiresAuth: true }
    }
  ]
})
```

#### Backend Development

**1. Create a new API endpoint**:

```typescript
// apps/api/src/routes/users.routes.ts
import { Router } from 'express'
import { usersController } from '../controllers/users.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/', requireAuth, usersController.getAll)
router.get('/:id', requireAuth, usersController.getById)
router.post('/', requireAuth, usersController.create)
router.put('/:id', requireAuth, usersController.update)
router.delete('/:id', requireAuth, usersController.delete)

export default router
```

**2. Create controller**:

```typescript
// apps/api/src/controllers/users.controller.ts
import { Request, Response } from 'express'

export const usersController = {
  async getAll(req: Request, res: Response) {
    // Replace with your data source (database, external API, etc.)
    res.json({ success: true, data: [] })
  },

  async getById(req: Request, res: Response) {
    const { id } = req.params
    // Replace with your data source
    res.json({ success: true, data: { id } })
  }

  // ... create, update, delete methods
}
```

**3. Register routes**:

```typescript
// In apps/api/src/app.ts, add:
import usersRoutes from './routes/users.routes.js'

// After auth routes
app.use('/api/v1/users', usersRoutes)
```

### Hot Reload

**Frontend (Vite)**: Changes to `.vue`, `.ts`, `.css` files trigger instant hot module replacement (HMR).

**Backend (Node.js native watch)**: Changes to `.ts` files trigger server restart.

**Note**: The API server uses Node.js native `--watch` mode (not `tsx watch`) for proper signal handling during graceful shutdown.

## Testing

### Unit Tests

**Run all unit tests** (Vitest):

```bash
# Run all unit tests
npm test

# Watch mode
npm run test:watch

# Run tests for a specific workspace
npm test --workspace=apps/api
npm test --workspace=packages/config
```

### Writing Tests

```typescript
// apps/api/src/middleware/auth.middleware.test.ts
import { describe, it, expect } from 'vitest'
import { requireAuth } from './auth.middleware.js'

describe('requireAuth', () => {
  it('should return 401 if no session user', () => {
    // ... test implementation
  })
})
```

## Linting and Formatting

### ESLint

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

### Prettier

```bash
# Format all files
npm run format

# Check formatting (CI)
npm run format:check
```

### Pre-commit Hooks

Husky runs linting and formatting automatically on commit.

## Type Checking

### TypeScript

```bash
# Type check all workspaces
npm run typecheck

# Type check specific workspace
npm run typecheck:api
npm run typecheck:web
```

### Shared Types

**Define shared types** in [packages/shared/](../packages/shared/):

```typescript
// packages/shared/src/types/user.types.ts
export interface User {
  id: string
  name: string
  email: string
}
```

**Use in frontend or backend**:
```typescript
import type { User } from '@template/shared'
```

## Debugging

### VS Code Debugging

**Frontend (Chrome DevTools)**:

1. Press F12 in browser
2. Sources tab → Open file
3. Set breakpoints
4. Trigger code execution

**Backend (Node.js Inspector)**:

[.vscode/launch.json](.vscode/launch.json):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/apps/api",
      "runtimeExecutable": "node",
      "runtimeArgs": ["--import", "tsx", "--inspect", "src/server.ts"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

**Development logging**:

```typescript
// API logs (Pino - pretty-printed in dev)
logger.info({ data }, 'Debug info')

// Frontend logs
console.log('Component mounted:', componentName)
```

## Environment Variables

### Loading Behavior

**Development** ([apps/api/src/server.ts](../apps/api/src/server.ts)):
- Uses `find-up` to locate `.env` file in monorepo root
- Falls back to process.env if no `.env` file

**Production**:
- Reads from platform environment variables (Azure App Service, OpenShift)
- No `.env` file required

### Validation

**Validation schema**: [packages/config/src/schemas/api.config.schema.ts](../packages/config/src/schemas/api.config.schema.ts)

### Adding New Variables

**1. Add to schema**:

```typescript
// packages/config/src/schemas/api.config.schema.ts
export const apiConfigSchema = z.object({
  // ... existing fields
  NEW_FEATURE_ENABLED: z.coerce.boolean().default(false)
})
```

**2. Add to .env.example**:

```bash
# Feature Flags
NEW_FEATURE_ENABLED=true
```

**3. Use in code**:

```typescript
const enabled = process.env.NEW_FEATURE_ENABLED === 'true'
```

## Common Tasks

### Clear Node Modules

```bash
# Clean all node_modules (root + workspaces)
npm run clean

# Reinstall
npm install
```

### Update Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Update specific package
npm update <package-name> --workspace=apps/api
```

## Troubleshooting

See [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed troubleshooting guides.

**Quick fixes**:

| Issue | Solution |
|-------|----------|
| Port 3000 already in use | `lsof -ti:3000 \| xargs kill` (Mac/Linux) or check TROUBLESHOOTING.md for Windows |
| Redis connection failed | Verify Redis is running, check `REDIS_URL` in `.env` |
| Frontend can't reach API | Check CORS_ORIGIN matches web dev server URL |
| TypeScript errors | Run `npm run typecheck` to see all errors |
| Hot reload not working | Restart dev servers with `npm run dev` |

## Additional Resources

- [Authentication Setup](AUTH-SETUP.md)
- [GoA Components Guide](GOA-COMPONENTS.md)
- [Testing Documentation](TESTING.md)
- [Deployment Guide](DEPLOYMENT.md)

---

**Last Updated**: 2026-02-19
