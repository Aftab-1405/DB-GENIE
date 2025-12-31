# Upstash Redis Integration

Documentation for Upstash Redis usage in Moonlit backend.

## Overview

Upstash is a serverless Redis provider used for:
1. **Session Storage** - Persistent user sessions across server restarts
2. **Per-User Quota Tracking** - Rate limiting counters with automatic TTL expiration

## Connection Configuration

```env
# .env file
UPSTASH_REDIS_URL=redis://default:PASSWORD@HOST:6379
```

**Note:** The backend automatically converts `redis://` to `rediss://` for TLS encryption (required by Upstash).

---

## Use Case 1: Session Storage

**Location:** `main.py` (lifespan)

**Purpose:** Store user sessions persistently instead of in-memory.

**Key Format:**
```
session:<session_id>  →  User session data
```

**Why Redis for Sessions:**
- Sessions persist across server restarts
- Multiple server instances share session state
- Prevents "all users logged out" on every deploy

---

## Use Case 2: Per-User Quota Tracking

**Location:** `services/rate_limiting/user_quota.py`

**Purpose:** Track per-user API request counts for rate limiting.

**Key Format:**
```
quota:<user_id>:minute  →  TTL: 60s
quota:<user_id>:hour    →  TTL: 3600s
quota:<user_id>:day     →  TTL: 86400s
```

**Default Limits:**
| Timeframe | Limit |
|-----------|-------|
| Minute | 4 |
| Hour | 100 |
| Day | 500 |

**How It Works:**
1. Each request → `INCR` + `EXPIRE` on all three keys (atomic pipeline)
2. TTL ensures automatic reset when time window expires
3. No manual cleanup needed

**Why Redis for Quota:**
- Atomic increment operations
- Built-in TTL for automatic expiration
- Works across multiple server instances
- Sub-millisecond latency

---

## What About Query Result Cache?

**REMOVED** - We previously had a query result cache but removed it for simplicity.

### Why We Removed It

| Factor | With Cache | Without Cache (Current) |
|--------|------------|------------------------|
| Architecture | Complex (extra API call) | Simple (embedded in stream) |
| Cost at scale | Expensive (Upstash bandwidth) | Free |
| API calls | 2 per query | 1 per query |
| Code complexity | Higher | Lower |

### Current Flow (Embedded Data)

```
1. LLM runs execute_query tool
2. Backend returns:
   - preview: 5 rows → for LLM context (token-efficient)
   - data: all rows → for frontend SQL Editor
3. Frontend parses full data directly from tool result
4. No extra API call needed
```

### Why This Works

- LLM only sees `preview` (via result_summary in llm_service.py)
- Full `data` is embedded in the streamed tool marker
- Frontend parses `data` directly from the stream
- No cache, no extra fetch, simpler architecture

---

## Fallback Behavior

If Redis is unavailable:

| Scenario | Behavior |
|----------|----------|
| `UPSTASH_REDIS_URL` not set | Uses in-memory sessions (warning logged) |
| Redis connection fails | Falls back to in-memory |

---

## Monitoring

### View Keys in Upstash Console

1. Go to [console.upstash.com](https://console.upstash.com)
2. Select your database
3. Go to **Data Browser**
4. Filter by prefix:
   - `session:*` — User sessions
   - `quota:*` — Rate limit counters

---

## Cost Estimation

| Tier | Commands/Day | Cost |
|------|--------------|------|
| Free | 10,000 | $0 |
| Pay-as-you-go | 100,000+ | ~$0.2 per 100K |

**Session usage:**
- Login: 1 write
- Each API call: 1 read

**Quota usage (per LLM request):**
- 3 GET operations (minute, hour, day)
- 3 INCR + 3 EXPIRE operations

---

## Files Using Redis

| File | Purpose |
|------|---------|
| `main.py` | Redis client initialization in lifespan |
| `services/rate_limiting/user_quota.py` | Per-user quota tracking |
| `.env` | `UPSTASH_REDIS_URL` variable |

---

## Removed Files/Code

| File | What Was Removed |
|------|------------------|
| `services/result_cache.py` | **DEPRECATED** - Still exists but unused |
| `api/routes.py` | Removed `/query-result/<id>` endpoint |
| `vite.config.js` | Removed `/query-result` proxy |
