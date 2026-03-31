# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TheStock.Club is a financial intelligence platform for investment fund and stock analysis. The application consists of:
- **Backend**: FastAPI (Python) REST API with PostgreSQL database and AI agent capabilities
- **Frontend**: Next.js 15 (React 19) with internationalization (next-intl) and Tailwind CSS

## Development Commands

### Backend (from `/backend` directory)

Start development server:
```bash
conda activate fundlord
python main.py
```

The backend runs on:
- Development: `http://localhost:8080`
- Production: `https://thestock.club:443` (with SSL)

Run database migrations:
```bash
alembic upgrade head
```

Create a new migration:
```bash
alembic revision --autogenerate -m "description"
```

### Frontend (from `/frontend` directory)

Start development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Lint the codebase:
```bash
npm run lint
```

The frontend runs on `http://localhost:3000`

### Start Both Services

From the root directory:
```bash
./start.sh
```

This opens separate terminal windows for both backend and frontend on macOS.

## Architecture

### Backend Structure (`/backend`)

**Core Application Files:**
- `main.py` - FastAPI application entry point with router registration and startup initialization
- `agent.py` - LangChain-based AI agent with tools for fund/stock analysis
- `util.py` - Shared utilities including environment detection

**API Layer (`/backend/api`):**
- Modular router-based organization with dedicated files per resource
- Routers: `funds.py`, `stocks.py`, `chat.py`, `auth.py`, `admin.py`, `benchmarks.py`, `categories.py`, `data_sync.py`, `health.py`
- Each router is registered in `__init__.py` with specific prefixes and tags
- `utils.py` - Shared API utilities (see API Utilities section below)
- **`API_GUIDELINES.md` - MUST READ before creating new endpoints**

**Database Layer (`/backend/database`):**
- `connection.py` - SQLAlchemy connection management with connection pooling
- `models/` - SQLAlchemy ORM models (fund, stock, user, category, benchmark, chat, data_task)
- `repositories/` - Data access layer following repository pattern
  - Each repository inherits from base and handles specific domain logic
  - `FundDatabase` class unifies all repositories into single interface
- Database migrations handled via Alembic

**AI & Analysis:**
- `agent.py` - GPT-4 powered AI agent with LangChain tool calling
  - Tools for fund analysis, stock analysis, category search, volatility calculations
  - Custom `ToolOutputWithArtifact` class for structured responses with metadata
- `fund_analysis.py` - Financial analysis utilities for drawdowns and volatility
- `stock_analysis.py` - Stock-specific analysis functions
- `vector/` - pgvector-based semantic search for fund categories using embeddings

**API Utilities (`/backend/api/utils.py`):**
Shared utilities to reduce code duplication across API endpoints:
- **Response helpers:** `success_response()`, `paginated_response()`, `error_response()`
- **Date/time:** `get_date_range()`, `format_datetime_iso()`
- **Validation:** `require_fields()`, `validate_positive_int()`
- **Resources:** `get_resource_or_404()`, `safe_float()`
- **Error handling:** `@handle_errors` decorator for consistent error handling
- **Price history:** `fetch_price_history_with_dates()`, `calculate_price_change()`
- See `backend/api/REFACTORING_GUIDE.md` for usage examples

**Key Patterns:**
- Repository pattern separates data access from business logic
- AI agent tools return structured data that can include artifacts (visual components)
- Environment-aware configuration using `is_production()` utility
- API utilities for consistent responses and error handling

### Frontend Structure (`/frontend/src`)

**App Router (`/src/app`):**
- Next.js 15 app directory structure with file-based routing
- `[locale]/` - Internationalized routes for multi-language support
  - Pages: `admin/`, `fund/`, `stock/`, `chat/`, `compare/`, `benchmark/`, `login/`, `register/`
- `layout.js` - Root layout with internationalization setup
- `globals.css` - Global Tailwind styles

**Components (`/src/components`):**
- `ChatContent.js` - AI chat interface with message handling and artifact rendering
- `PriceChart.js` - Time-series price charts using @visx
- `FundCard.js`, `StockCard.js` - Display cards for financial instruments
- `FundTable.js`, `StockTable.js` - Tabular data views
- `header.js`, `footer.js` - Layout components
- `artifact/` - Dynamic components rendered from AI agent responses
- `pages/` - Page-specific components
- `ui/` - Shadcn/ui components (reusable UI primitives)

**Configuration & Context:**
- `contexts/` - React contexts for global state
- `lib/` - Utility functions and shared logic
- `i18n/` - Internationalization configuration with next-intl
- `middleware.js` - Next.js middleware for route handling

**Key Patterns:**
- Server and client components following Next.js 15 conventions
- Internationalization using next-intl with locale-based routing
- UI components from Radix UI + Tailwind (shadcn/ui pattern)
- API communication with backend at `localhost:8080` (dev) or production URL

## Database

PostgreSQL with pgvector extension for semantic search:
- Connection details in `alembic.ini` and `backend/database/connection.py`
- Default dev connection: configured via `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME` environment variables
- Uses SQLAlchemy 2.0 with connection pooling (pool_size=10, max_overflow=20)

**Core Tables:**
- `funds` - Investment fund data with performance metrics
- `stocks` - Stock/equity data with financial metrics
- `fund_price_history` - Historical price data for funds
- `fund_holdings` - Fund portfolio compositions
- `categories` - Fund categorization with vector embeddings for search
- `users` - User accounts with password hashing
- `conversations`, `messages` - Chat history storage
- `data_tasks` - Background data synchronization task logs

## AI Agent System

The AI agent (`backend/agent.py`) uses LangChain with GPT-4o and provides tools for:
- Fund queries: best YTD/90d performance, fund details by ISIN, top holdings
- Stock queries: stock information by ticker symbol
- Portfolio analysis: fund comparison, fee analysis, volatility calculations
- Semantic search: category-based fund search using pgvector
- Risk analysis: drawdown analysis and recovery period calculations

**Tool Response Pattern:**
- Tools can return `ToolOutputWithArtifact` to trigger frontend component rendering
- Artifacts: `fund_info`, `stock_info`, `top_holdings` trigger specific visual components
- Agent formats responses in Markdown for rich text display

## Environment & Configuration

**Backend Environment Variables (`.env`):**
- `OPENAI_API_KEY` - Required for AI agent
- `NODE_ENV` or `PRODUCTION` - Environment detection
- Database credentials (see `alembic.ini` for defaults)

**Production Deployment:**
- Backend checks `is_production()` for SSL, CORS, and port configuration
- Production URLs: `https://thestock.club`, `https://www.thestock.club`

## Dependencies

**Backend (Python):**
- FastAPI + Uvicorn for async API
- SQLAlchemy 2.0 + Alembic for database
- LangChain + OpenAI for AI capabilities
- pgvector for semantic search
- yfinance for financial data fetching

**Frontend (JavaScript):**
- Next.js 15 with React 19
- next-intl for internationalization
- @visx for data visualization
- Radix UI primitives + Tailwind CSS
- Lucide React for icons

## API Endpoints

Base URL: `http://localhost:8080/api` (dev)

- `/funds/*` - Fund data and search
- `/stocks/*` - Stock data and search
- `/chat` - AI agent chat interface
- `/categories/*` - Fund category search
- `/benchmarks/*` - Benchmark data
- `/auth/*` - Authentication (login, register, verify)
- `/admin/*` - Admin operations
- `/data-sync/*` - Data synchronization tasks
- `/health` - Health check

See `backend/api/README.md` for detailed endpoint documentation.

## Code Conventions

**Backend:**
- **IMPORTANT:** Read `backend/api/API_GUIDELINES.md` before creating new API endpoints
- Use type hints for function signatures
- Repository pattern for all database access
- Router-based API organization (avoid monolithic files)
- ALWAYS use `api/utils.py` utilities - never duplicate common patterns
- ALWAYS use `@handle_errors` decorator on all endpoint functions
- ALWAYS use `success_response()` and `paginated_response()` for responses
- ALWAYS use `get_resource_or_404()` for database lookups
- ALWAYS use `error_response()` instead of raising HTTPException directly
- Use helper functions: `format_datetime_iso()`, `safe_float()`, `get_date_range()`, etc.
- Custom serializer for Decimal/datetime in JSON responses (`agent.py:default_serializer`)
- ISINs are 12-character fund identifiers (e.g., `LU0090845842`)
- Tickers are 1-5 character stock symbols (e.g., `AAPL`, `JPM`)

**Frontend:**
- Use Server Components by default, mark Client Components with `'use client'`
- Internationalization through `useTranslations()` hook
- Component naming: PascalCase for components, camelCase for utilities
- API calls use fetch with error handling
- Markdown rendering for AI responses via `react-markdown`
