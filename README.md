# Vue.js + Node.js Alberta Public Application Template

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-green)](https://vuejs.org/)
[![Node 24](https://img.shields.io/badge/Node-24.x-green)](https://nodejs.org/)
[![GoA Design System](https://img.shields.io/badge/GoA-Design%20System-blue)](https://design.alberta.ca/)
[![Status](https://img.shields.io/badge/Status-v1.0%20Skeleton-yellow)](https://github.com)

**Monorepo template** for Alberta Government public-facing applications with official GoA Design System web components, SAML 2.0 authentication (Alberta.ca Account), BFF API gateway, and TypeScript throughout.

> **Template Status**: v1.0 skeleton release. Core structure and local development workflow are in place. See [Disclaimer](#disclaimer) for current limitations.

## Features

### Core Stack
- **Monorepo Structure** - npm workspaces with shared packages
- **TypeScript Everywhere** - Strict mode, type-safe configuration
- **Vue 3 + Vite** - Modern frontend with hot module replacement
- **Express 5 + TypeScript** - Backend API with full type safety
- **Node.js Native Watch** - Proper signal handling and graceful shutdown

### Authentication & Security
- **SAML Authentication** - Alberta.ca Account (SAML 2.0) + Mock (local dev)
- **Security Hardened** - Helmet CSP, CORS, rate limiting, CSRF protection
- **Session Management** - Redis (production) or memory (development)
- **BFF API Gateway** - Proxies requests to private backend with OAuth Client Credentials

### Design & Frontend
- **GoA Design System** - Official @abgov/web-components integration
- **Vue Wrapper Components** - v-model support for GoA components
- **TypeScript Declarations** - Full IDE autocomplete for all components

### Infrastructure & Deployment
- **Docker Ready** - Multi-stage Dockerfiles and docker-compose
- **Platform Agnostic** - Azure App Service, OpenShift, Kubernetes support
- **Redis** - Session store with health checks and graceful shutdown
- **Environment Discovery** - Automatic .env loading with find-up

### Quality & Testing
- **Testing Setup** - Vitest (unit) + Supertest (integration) + Playwright (E2E)
- **Code Quality** - ESLint, Prettier, TypeScript strict mode
- **CI/CD Ready** - GitHub Actions workflow templates

### Documentation
- **Comprehensive Docs** - Detailed guides covering all aspects
- **Placeholder Pattern** - Consistent {{VARIABLE_NAME}} format (GitHub-safe)

## Prerequisites

- **Node.js** 24.x or higher (LTS)
- **npm** 10.x or higher
- **Redis** (optional, for production session store)
- **Docker** (optional, for containerized development)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings (default values work for local dev)
```

### 3. Start Development Servers

**Option A: Local Development** (without Docker)

```bash
# Terminal 1: Start API
npm run dev:api

# Terminal 2: Start Web
npm run dev:web
```

- **Web App**: http://localhost:5173
- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/v1/health

**Option B: Docker Development**

```bash
# Start all services (redis + api + web)
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## Project Structure

```
aim-vue-node-template/
├── apps/
│   ├── web/                      # Vue 3 + Vite + TypeScript frontend
│   │   ├── src/
│   │   │   ├── components/       # Vue components
│   │   │   │   ├── goa/          # GoA wrapper components (v-model support)
│   │   │   │   └── layout/       # Layout components (AppHeader, AppLayout)
│   │   │   ├── views/            # Page views (Home, About, Login, Profile)
│   │   │   ├── router/           # Vue Router configuration
│   │   │   ├── stores/           # Pinia state stores (auth store)
│   │   │   └── main.ts           # Application entry point
│   │   └── vite.config.ts        # Vite configuration
│   │
│   └── api/                      # Express 5 + TypeScript backend (BFF)
│       ├── src/
│       │   ├── routes/           # API route definitions + gateway routes
│       │   ├── controllers/      # HTTP request handlers
│       │   ├── services/         # Business logic + API gateway + token cache
│       │   ├── middleware/       # Express middleware (auth, CSRF, rate limit)
│       │   ├── config/           # Redis, OAuth, and environment config
│       │   ├── utils/            # Structured logger + PII redaction
│       │   ├── app.ts            # Express app setup (security headers, session)
│       │   └── server.ts         # Server entry point (with graceful shutdown)
│       └── tsconfig.json         # TypeScript configuration
│
├── packages/                     # Shared monorepo packages
│   ├── shared/                   # Shared types & schemas (cross-app)
│   ├── config/                   # Zod configuration validation + presets
│   └── auth/                     # Auth driver implementations
│       ├── drivers/              # MockAuthDriver, SamlAuthDriver
│       └── config/               # SAML configuration
│
├── docker/                       # Docker configuration
│   ├── api.Dockerfile            # Multi-stage Node.js API build
│   ├── web.Dockerfile            # Multi-stage Vue build
│   └── nginx.conf                # Nginx configuration for SPA routing
│
├── docs/                         # Documentation (auth, security, deployment, etc.)
│
├── .env.example                  # Development environment template
├── .env.external.example         # External (SAML) production template
├── PLACEHOLDERS.md               # Placeholder pattern reference
├── CODEMAP.md                    # Codebase map and architecture overview
└── docker-compose.yml            # Local development orchestration
```

## Testing

Tests are co-located with source files (e.g. `auth.service.test.ts` next to `auth.service.ts`).

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

## Authentication

The template supports two authentication modes:

### Mock Authentication (Local Development)
Set `AUTH_DRIVER=mock` in `.env` - no real IdP required

### SAML (Alberta.ca Account)
Set `AUTH_DRIVER=saml` and configure:
- `SAML_ENTRY_POINT`
- `SAML_ISSUER`
- `SAML_CERT`
- `SAML_PRIVATE_KEY` (optional)

See [AUTH-SETUP.md](docs/AUTH-SETUP.md) for detailed configuration instructions.

## API Gateway (BFF Pattern)

This template uses a Backend-for-Frontend pattern. The API server proxies authenticated requests to the private-facing backend:

- **No database** - Data is fetched via API from the private backend
- **OAuth Client Credentials** - Service-to-service authentication
- **Gateway routes** at `/api/v1/data/*` proxy to the private backend

Configure the gateway with:
```bash
PRIVATE_API_BASE_URL=http://private-api:3001/api/v1
OAUTH_TENANT_ID={{AZURE_TENANT_ID}}
OAUTH_CLIENT_ID={{S2S_CLIENT_ID}}
OAUTH_CLIENT_SECRET={{S2S_CLIENT_SECRET}}
OAUTH_SCOPE={{S2S_OAUTH_SCOPE}}
```

## Building for Production

```bash
# Build all apps
npm run build

# Build specific app
npm run build:api
npm run build:web

# Run production build locally
npm start --workspace=apps/api
```

## Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Run production containers
docker-compose -f docker-compose.yml up
```

## Documentation

### Essential Guides
| Document | Description |
|----------|-------------|
| [TECHNICAL-DOCUMENTATION.md](docs/TECHNICAL-DOCUMENTATION.md) | System design, BFF pattern, driver architecture |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Development workflow and best practices |
| [AUTH-SETUP.md](docs/AUTH-SETUP.md) | SAML authentication configuration |
| [CODEMAP.md](CODEMAP.md) | Codebase map and architecture overview |

### Technical Documentation
| Document | Description |
|----------|-------------|
| [GOA-COMPONENTS.md](docs/GOA-COMPONENTS.md) | GoA Design System integration guide |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Azure, OpenShift, Docker deployment |
| [CYBERSECURITY-ASSESSMENT-REMEDIATION.md](docs/CYBERSECURITY-ASSESSMENT-REMEDIATION.md) | Security assessment and remediation report |
| [TESTING.md](docs/TESTING.md) | Testing strategy (unit/integration/E2E) |

### Reference
| Document | Description |
|----------|-------------|
| [PLACEHOLDERS.md](PLACEHOLDERS.md) | Placeholder pattern reference |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [ROADMAP.md](docs/ROADMAP.md) | Feature roadmap and planned enhancements |

## GoA Design System

This template uses the official Government of Alberta Design System:

- **Package**: [@abgov/web-components](https://www.npmjs.com/package/@abgov/web-components)
- **Documentation**: [design.alberta.ca](https://design.alberta.ca/)
- **Web Components**: Technology-agnostic custom elements
- **Vue Wrappers**: Thin wrapper layer for v-model support

## Configuration

All configuration is managed through environment variables with Zod schema validation:

```bash
# Required
NODE_ENV = development|production
SESSION_SECRET = {{GENERATE_WITH_OPENSSL_RAND_BASE64_32}}

# Auth (choose one driver)
AUTH_DRIVER = mock|saml

# SAML (if using SAML driver)
SAML_ENTRY_POINT = {{YOUR_SAML_IDP_SSO_URL}}
SAML_CERT = {{YOUR_IDP_CERTIFICATE_BASE64}}

# Session Store (Redis for production)
SESSION_STORE = memory|redis
REDIS_URL = redis://localhost:6379

# Optional
PORT = 3000
CORS_ORIGIN = http://localhost:5173
LOG_LEVEL = debug|info|warn|error
```

**Placeholder Pattern**: Values in `{{VARIABLE_NAME}}` format are placeholders. Replace with actual values (remove the `{{ }}` brackets). See [PLACEHOLDERS.md](PLACEHOLDERS.md) for complete reference.

**Configuration Files**:
- [`.env.example`](.env.example) - Development with mock auth
- [`.env.external.example`](.env.external.example) - External (SAML) production

## Getting Started

### For New Projects

1. **Clone the template**
   ```bash
   git clone <repository-url> my-alberta-app
   cd my-alberta-app
   ```

2. **Customize for your project**
   - Review [CODEMAP.md](CODEMAP.md) for architecture overview
   - Update project metadata (package.json, branding)
   - Configure authentication (SAML) via [AUTH-SETUP.md](docs/AUTH-SETUP.md)
   - Set up API gateway for private backend
   - See [PLACEHOLDERS.md](PLACEHOLDERS.md) for values to replace

3. **Start development**
   ```bash
   npm install
   cp .env.example .env
   npm run dev
   ```

## Technical Specifications

| Category | Technology | Version |
|----------|-----------|---------|
| **Runtime** | Node.js | 24.x LTS |
| **Package Manager** | npm | 10.x |
| **Frontend Framework** | Vue.js | 3.5.x |
| **Build Tool** | Vite | 7.3.x |
| **Backend Framework** | Express | 5.2.x |
| **Language** | TypeScript | 5.7.x |
| **Session Store** | Redis | 7.x |
| **Design System** | @abgov/web-components | Latest |
| **Container Runtime** | Docker | 24.x+ |
| **Testing - Unit** | Vitest | 3.2.x |
| **Testing - E2E** | Playwright | 1.58.x |

## Support

### Documentation Resources
- [Technical Documentation](docs/TECHNICAL-DOCUMENTATION.md) - System design and patterns
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Development](docs/DEVELOPMENT.md) - Development workflow
- [Codemap](CODEMAP.md) - Codebase architecture overview

### External Resources
- [GoA Design System](https://design.alberta.ca/) - Official design documentation
- [GoA Components](https://components.design.alberta.ca/) - Component library reference
- [Vue 3 Documentation](https://vuejs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

### Getting Help
1. Check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues
2. Review relevant documentation in [docs/](docs/)
3. Search existing issues in the repository
4. Open a new issue with detailed information

## Disclaimer

> **v1.0 — Skeleton Release**
>
> This template is released as a foundational skeleton intended to accelerate project setup. It does not yet represent a production-ready, fully integrated solution. Users should be aware of the following limitations:
>
> - **No public-to-internal backend integration** — The API gateway between the public-facing backend and internal backend services is not yet connected. Gateway routing and token relay are stubbed but non-functional.
> - **No Alberta.ca integration** — Authentication against Alberta.ca Account (SAML 2.0) is not configured. The template currently operates with a mock authentication driver only.
> - **Not production-hardened** — While baseline security controls are in place (session management, CSRF protection, CSP headers), the template has not undergone the full integration testing and hardening required for a production deployment.
> - **Subject to change** — APIs, configuration schemas, folder structure, and conventions may change in future releases as real integrations are added and the template matures.
>
> This release is suitable for **local development, prototyping, and familiarization**. Teams adopting this template should expect to contribute integration work and should not deploy it to production environments without completing the outstanding integrations and a thorough security review.

## License

ISC

---

**Built for Alberta Government**
