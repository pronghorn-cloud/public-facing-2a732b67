# Technical Documentation

**AIM Vue Node Alberta Public Application Template**

> A production-ready, security-hardened monorepo template for building Government of Alberta public-facing web applications with Vue 3, Express 5, and pluggable SAML authentication.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Technology Stack](#3-technology-stack)
4. [Package: @template/shared](#4-packagetemplateshared)
5. [Package: @template/config](#5-packagetemplateconfig)
6. [Package: @template/auth](#6-packagetemplateauth)
7. [Application: API (Express 5)](#7-application-api-express-5)
8. [Application: Web (Vue 3)](#8-application-web-vue-3)
9. [Authentication System](#9-authentication-system)
10. [Security Architecture](#10-security-architecture)
11. [Session Storage](#11-session-storage)
12. [Observability](#12-observability)
13. [Docker & Containerization](#13-docker--containerization)
14. [Configuration Management](#14-configuration-management)
15. [Build System & Scripts](#15-build-system--scripts)
16. [Testing Strategy](#16-testing-strategy)
17. [GoA Design System Integration](#17-goa-design-system-integration)
18. [Environment Setup](#18-environment-setup)
19. [Deployment](#19-deployment)
20. [Architectural Decision Rationale](#20-architectural-decision-rationale)

---

## 1. Architecture Overview

The template implements a **Backend-for-Frontend (BFF)** pattern where the Express API acts as an authentication and session management layer between the Vue SPA and external identity providers.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
│                    (HTTPS Termination)                           │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
    ┌──────────▼──────────┐       ┌───────────▼──────────┐
    │   Web Container     │       │   API Container       │
    │   (Nginx :8080)     │       │   (Node.js :3000)     │
    │                     │       │                       │
    │   Vue 3 SPA         │  API  │   Express 5           │
    │   Tailwind CSS      ├──────►│   Session Mgmt        │
    │   GoA Design System │       │   Auth Drivers        │
    │   Pinia Store       │       │   Middleware Chain     │
    └─────────────────────┘       └───────────┬───────────┘
                                              │
                                  ┌───────────▼───────────┐
                                  │   Redis / Memory      │
                                  │   (Session Store)     │
                                  └───────────────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              │               │               │
                     ┌────────▼──┐   ┌────────▼──┐   ┌───────▼───┐
                     │  SAML 2.0 │   │   Mock    │   │  Private  │
                     │    IdP    │   │  (Dev)    │   │  Backend  │
                     └───────────┘   └───────────┘   └───────────┘
```

### Key Architectural Principles

- **Session-based authentication** — no JWTs; sessions are server-side in Redis for revocability and compliance
- **Pluggable auth drivers** — Strategy pattern allows runtime selection of Mock or SAML 2.0 via a single environment variable
- **Defense in depth** — layered security middleware (Helmet, CORS, CSRF, rate limiting, input validation, session hardening)
- **Monorepo with npm workspaces** — shared packages enforce consistency; build order is deterministic
- **GoA Design System first** — all UI uses Alberta Government web components for compliance with provincial design standards
- **BFF Gateway** — API proxies authenticated requests to private backend services, handling S2S OAuth token exchange

### Dependency Flow

```
packages/shared ──► packages/config ──► packages/auth
       │                   │                  │
       │                   ▼                  ▼
       └──────────► apps/web          apps/api
```

Build order: `shared` → `config` → `auth` → `api` + `web` (parallel)

---

## 2. Monorepo Structure

```
aim-vue-node-template/
├── apps/
│   ├── api/                        # Express 5 REST API (BFF)
│   │   ├── src/
│   │   │   ├── server.ts           # Entry point, graceful shutdown
│   │   │   ├── app.ts              # Middleware chain, routing
│   │   │   ├── instrumentation.ts  # OpenTelemetry setup
│   │   │   ├── controllers/        # HTTP request handlers
│   │   │   ├── services/           # Business logic
│   │   │   ├── routes/             # Route definitions
│   │   │   ├── middleware/         # Security & utility middleware
│   │   │   ├── config/             # Redis configuration
│   │   │   ├── utils/              # Logger, utilities
│   │   │   └── types/              # TypeScript declarations
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                        # Vue 3 SPA
│       ├── src/
│       │   ├── main.ts             # Entry point
│       │   ├── App.vue             # Root component
│       │   ├── components/
│       │   │   ├── goa/            # GoA Design System wrappers
│       │   │   └── layout/         # Header, Footer, Layout
│       │   ├── views/              # Page components
│       │   ├── router/             # Vue Router config
│       │   ├── stores/             # Pinia state management
│       │   ├── types/              # Component type declarations
│       │   └── assets/             # Styles, images
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── package.json
│
├── packages/
│   ├── shared/                     # Shared types & Zod schemas
│   ├── config/                     # Env validation & presets
│   └── auth/                       # Authentication drivers
│
├── docker/
│   ├── api.Dockerfile              # Multi-stage API build
│   ├── web.Dockerfile              # Multi-stage Web build
│   └── nginx.conf                  # Non-root Nginx config
│
├── docs/                           # Documentation
├── docker-compose.yml              # Local development orchestration
├── tsconfig.base.json              # Shared TypeScript config
├── .eslintrc.cjs                   # ESLint flat config
├── .prettierrc.json                # Code formatting rules
├── .env.example                    # Mock auth (development)
├── .env.external.example           # SAML auth (external/production)
└── package.json                    # Root workspace config
```

---

## 3. Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Language** | TypeScript (strict) | 5.7.x | Type safety, IDE tooling, compile-time error detection |
| **Frontend** | Vue 3 (Composition API) | 3.5.x | Lightweight, approachable, Composition API for complex logic |
| **State** | Pinia | 2.3.x | Official Vue state management, TypeScript-first, devtools |
| **Routing** | Vue Router 4 | 4.5.x | Lazy loading, navigation guards, meta-driven auth |
| **Styling** | Tailwind CSS + GoA Tokens | 3.4.x | Utility-first CSS complementing GoA Design System tokens |
| **Design System** | GoA Web Components | 1.39.x | Alberta Government mandated UI components |
| **Backend** | Express 5 | 5.2.x | Stable, widely supported, async middleware support |
| **Validation** | Zod | 3.24.x | Runtime + compile-time validation, schema-driven config |
| **Session Store** | Redis (node-redis v5) | 5.11.x | In-memory data store; supports Entra ID auth for Azure |
| **Session Middleware** | express-session + connect-redis | 1.19.x / 8.x | Server-side sessions in Redis for compliance |
| **Auth (SAML)** | @node-saml/passport-saml | 5.1.x | SAML 2.0 standard for external-facing apps |
| **Security** | Helmet | 8.1.x | HTTP security headers (CSP, HSTS, etc.) |
| **Logging** | Pino | 9.6.x | JSON structured logging, SIEM-compatible |
| **Observability** | OpenTelemetry | latest | Cloud-agnostic distributed tracing and metrics |
| **Build** | Vite | 5.4.x | Fast dev server, optimized production builds |
| **Testing** | Vitest + Playwright | 2.1.x | Vite-native, fast unit tests + E2E |
| **Containers** | Docker + Nginx Alpine | 24/1.x | Multi-stage builds, non-root production images |

### Explicitly Excluded Technologies

| Excluded | Replacement | Reason |
|----------|-------------|--------|
| JWT | Server-side sessions | Revocability, compliance; JWTs cannot be invalidated server-side |
| Vuex | Pinia | Pinia is Vue's official state library; Vuex is legacy |
| PostgreSQL | Redis | Public-facing template needs no application database; Redis is lighter for session-only storage |
| ORMs (Prisma, TypeORM) | N/A | No database layer; session storage handled by connect-redis |
| Webpack | Vite | Faster dev/build, native ES module support |
| Joi / Yup | Zod | TypeScript-first inference, smaller bundle, consistent API |
| CSS-in-JS | Tailwind + GoA tokens | GoA Design System uses CSS custom properties |

---

## 4. Package: @template/shared

**Location:** `packages/shared/`
**Purpose:** Foundation package providing shared types, Zod schemas, and constants consumed by all other packages.

Currently exports shared Zod schema primitives and TypeScript type definitions. It is intentionally kept minimal — only code needed by multiple consumers belongs here.

---

## 5. Package: @template/config

**Location:** `packages/config/`
**Purpose:** Centralized environment variable loading, Zod-based validation, and deployment presets for both API and Web applications.

### API Schema

Validates 50+ environment variables across categories:

| Category | Variables | Examples |
|----------|-----------|----------|
| Application | 3 | `NODE_ENV`, `PORT`, `APP_NAME` |
| Session | 10 | `SESSION_SECRET`, `SESSION_STORE`, `SESSION_MAX_AGE` |
| Redis | 4 | `REDIS_AUTH_MODE`, `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT` |
| Auth General | 2 | `AUTH_DRIVER` (mock\|saml), `AUTH_CALLBACK_URL` |
| SAML | 8+ | `SAML_ENTRY_POINT`, `SAML_ISSUER`, `SAML_CERT` |
| CORS | 2 | `CORS_ORIGIN`, `CORS_CREDENTIALS` |
| Security | 5 | `RATE_LIMIT_MAX`, `ALLOWED_HOSTS` |
| API Gateway | 4 | `PRIVATE_API_BASE_URL`, `OAUTH_TENANT_ID` |
| Logging | 3 | `LOG_LEVEL`, `LOG_FORMAT`, `LOG_PII` |

---

## 6. Package: @template/auth

**Location:** `packages/auth/`
**Purpose:** Pluggable authentication driver system implementing the Strategy pattern for Mock and SAML 2.0 authentication flows.

### Drivers

| Driver | Protocol | Use Case |
|--------|----------|----------|
| `MockAuthDriver` | N/A | Development — 3 pre-configured users |
| `SamlAuthDriver` | SAML 2.0 (SP-initiated SSO) | External-facing production apps |

**Production guard:** Mock driver throws if `NODE_ENV=production`.

---

## 7. Application: API (Express 5)

**Location:** `apps/api/`
**Purpose:** Backend-for-Frontend (BFF) server providing authentication, session management, security middleware, API gateway, and health endpoints.

### Entry Point (`server.ts`)

- `.env` file discovery using `find-up`
- Async app creation via `await createApp()` (top-level await, ESM)
- Graceful shutdown on `SIGTERM`/`SIGINT` with 10-second force timeout
- Redis client cleanup before process exit

### Middleware Chain (`app.ts`)

```
Request → Helmet → Cache-Control → Host Validation → CORS → Rate Limiting
→ HTTP Logging → Body Parsers → HPP → Content-Type Validation
→ Session (Redis/Memory) → CSRF Protection → Routes → Response
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/auth/login` | Public | Initiate authentication |
| `GET` | `/api/v1/auth/callback` | Public | Handle IdP callback |
| `POST` | `/api/v1/auth/logout` | Required | Destroy session |
| `GET` | `/api/v1/auth/me` | Required | Get current user |
| `GET` | `/api/v1/auth/status` | Public | Check auth status |
| `GET` | `/api/v1/csrf-token` | Public | Retrieve CSRF token |
| `GET` | `/api/v1/health` | Public | Redis connectivity check |
| `GET` | `/api/v1/info` | Public | API metadata (reduced in prod) |
| `ALL` | `/api/v1/data/*` | Required | BFF gateway to private backend |

### Dependencies

| Package | Rationale |
|---------|-----------|
| `express` v5 | Async route handler support |
| `helmet` | Security headers |
| `express-session` + `connect-redis` | Redis session store |
| `redis` v5 | Redis client with Entra ID support |
| `@azure/identity` + `@redis/entraid` | Entra ID Redis authentication |
| `pino` + `pino-http` | Structured JSON logging |
| `zod` | Request validation |

---

## 8. Application: Web (Vue 3)

**Location:** `apps/web/`
**Purpose:** Single-page application with GoA Design System compliance, authentication flows, and reactive state management.

### Routing

| Path | Component | Auth |
|------|-----------|------|
| `/` | `HomeView` | Public |
| `/about` | `AboutView` | Public |
| `/login` | `LoginView` | Guest only |
| `/profile` | `ProfileView` | Required |

### CSRF Handling

- Response interceptor captures `x-csrf-token` from API responses
- Request interceptor attaches `X-CSRF-Token` header to mutations

---

## 9. Authentication System

### Driver Selection

```bash
AUTH_DRIVER=mock       # Development (no IdP needed)
AUTH_DRIVER=saml       # External users (SAML 2.0 IdP)
```

### Session Lifecycle

1. **Login**: Session regenerated; CSRF secret preserved
2. **Active**: Rolling expiry; user validated via Zod on each access
3. **Logout**: Session destroyed, cookie cleared
4. **Expiry**: Redis TTL or memory garbage collection

---

## 10. Security Architecture

### Defense in Depth

| Layer | Mechanism |
|-------|-----------|
| Transport | HTTPS / TLS 1.2+, HSTS 365 days |
| Headers | Helmet CSP, X-Frame-Options, X-Content-Type-Options |
| Rate limiting | 100 general / 5 auth per 15 min |
| CORS | Origin whitelist |
| Input | Zod schema validation |
| CSRF | Token-based double submit |
| Authentication | Multi-driver + Zod session validation |
| Authorization | Role-based access control |
| Session | Server-side, regenerated, rolling expiry |
| Logging | PII redaction, security event logging |

---

## 11. Session Storage

### Overview

| Mode | `SESSION_STORE` | Use Case |
|------|-----------------|----------|
| Memory | `memory` (default) | Local development only |
| Redis | `redis` | Production — persistent, shared across replicas |

### Redis Authentication Modes

| Mode | `REDIS_AUTH_MODE` | Environment Variables | Use Case |
|------|-------------------|----------------------|----------|
| Access Key | `accesskey` (default) | `REDIS_URL` | Dev/test with simple connection string |
| Entra ID | `entraid` | `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME` | UAT/PROD passwordless auth |

**Entra ID mode** uses `DefaultAzureCredential` with `@redis/entraid` for automatic token acquisition and refresh. TLS is enforced. Dynamic imports ensure Azure packages are not loaded in access-key mode.

### Health Check

`/api/v1/health` reports: `"redis": "connected"` | `"disconnected"` | `"not_configured"`

---

## 12. Observability

- **Pino**: JSON structured logging (prod), pretty-printed (dev)
- **pino-http**: Auto request/response logging with PII redaction
- **OpenTelemetry**: Opt-in via `OTEL_ENABLED` — OTLP HTTP exporter

---

## 13. Docker & Containerization

Multi-stage builds for both API (Node.js) and Web (Nginx) containers. Non-root users, health checks, and layer caching optimizations.

---

## 14. Configuration Management

| File | Auth Driver | Use Case |
|------|------------|----------|
| `.env.example` | `mock` | Local development |
| `.env.external.example` | `saml` | Production (external users) |

---

## 15. Build System & Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API + Web dev servers |
| `npm run build` | Full monorepo build |
| `npm test` | Run all unit tests |
| `npm run typecheck` | TypeScript validation |
| `npm run lint` | ESLint |

---

## 16. Testing Strategy

| Framework | Purpose |
|-----------|---------|
| Vitest | Unit tests across all workspaces |
| Playwright | E2E tests (planned) |

---

## 17. GoA Design System Integration

- Global `@abgov/web-components` import
- Vite custom element recognition (`goa-*`, `goab-*`)
- Vue wrapper components for event bridging
- CSP constraint: `'unsafe-inline'` required

---

## 18. Environment Setup

```bash
npm install && cp .env.example .env && npm run dev
```

No external services required for local development (memory session store).

---

## 19. Deployment

### Production Checklist

| Item | Requirement |
|------|------------|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | 32+ character random string |
| `AUTH_DRIVER` | `saml` |
| `SESSION_STORE` | `redis` |
| `REDIS_AUTH_MODE` | `entraid` (recommended) |
| `CORS_ORIGIN` | Exact frontend origin |
| `ALLOWED_HOSTS` | API hostname whitelist |

See `docs/DEPLOYMENT.md` for platform-specific guides.

---

## 20. Architectural Decision Rationale

### Why Sessions Over JWT?

Immediate revocability, server-side control, smaller cookies, GoA compliance alignment.

### Why Redis Over PostgreSQL?

No application database needed for public-facing template. Redis is purpose-built for session storage with sub-millisecond lookups, native TTL, and simpler operations.

### Why Express 5?

Async middleware, ecosystem maturity, government familiarity, lightweight BFF fit.

### Why Zod?

TypeScript inference, single validation library across config/auth/requests.

### Why Monorepo?

Code sharing, consistent tooling, atomic changes, no external registry.

---

## Further Reading

| Document | Path | Description |
|----------|------|-------------|
| Quick Start | `README.md` | Project overview and getting started |
| Architecture Map | `CODEMAP.md` | Dependency graphs and API signatures |
| Authentication Setup | `docs/AUTH-SETUP.md` | SAML and Mock configuration |
| Development Guide | `docs/DEVELOPMENT.md` | Local setup, workflow, best practices |
| Deployment Guide | `docs/DEPLOYMENT.md` | Azure, OpenShift, Docker deployment |
| Testing Guide | `docs/TESTING.md` | Testing strategy |
| GoA Components | `docs/GOA-COMPONENTS.md` | Design System integration guide |
| Security Assessment | `docs/CYBERSECURITY-ASSESSMENT-REMEDIATION.md` | Security findings and remediation |
| Troubleshooting | `docs/TROUBLESHOOTING.md` | Common issues and solutions |
