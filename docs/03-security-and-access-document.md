# WEALTHFLOW — SECURITY AND ACCESS SPECIFICATION (SAS)
**Document Version:** 1.0.0  
**Status:** Under Review  
**Target Delivery:** Personal Finance & ERP V1.0  
**Security Standard:** OWASP Top 10 (2021) & API Security Top 10 Aligned  

---

## 1. Security Architecture Overview

Financial applications demand defense-in-depth across transport, authentication, authorization, data storage, and auditability. WealthFlow enforces strict tenant boundary isolation, cryptographic guest tokenization, object-level authorization (BOLA/IDOR prevention), input sanitization, and immutable audit trails.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          EDGE & TRANSPORT                              │
│  - Mandatory TLS 1.3 / Strict-Transport-Security (HSTS)               │
│  - Strict Content Security Policy (CSP), CORS Origin Whitelisting      │
│  - IP-based Sliding Window Rate Limiting                               │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION & ACCESS GATE                       │
│  - Registered User: Short-lived JWT (15m) + HttpOnly Secure Cookie     │
│  - Trip Guest: Cryptographic 256-bit URL Token (SHA-256 Hashed in DB)  │
│  - Brute Force Lockout & Replay Attack Defense via Idempotency Cache   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   AUTHORIZATION & TENANCY BOUNDARY                     │
│  - Object-Level Ownership Checks (`UserId == CurrentUserId`)           │
│  - EF Core Global Query Filters enforcing tenant data isolation        │
│  - Scoped Guest Policy: Guest can ONLY access `TripId == TokenTripId`  │
│  - ZERO access to personal accounts, investments, or other trips      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      DATA INTEGRITY & AUDITING                         │
│  - Parameterized LINQ queries (SQL Injection Immune)                  │
│  - Decimal(18,2) arithmetic (Float/Double forbidden)                   │
│  - Immutable Audit Log recording all state changes and actor IPs       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Architecture

WealthFlow employs a hybrid authentication strategy tailored to its user personas: registered account owners versus temporary trip guests.

### 2.1 Primary User Authentication (Multi-Device JWT + Refresh Tokens)
1. **Password Security:**
   - Managed via ASP.NET Core Identity with PBKDF2 (SHA-512, minimum 100,000 iterations) or Argon2id.
   - Enforced Password Policy: Minimum 12 characters, requiring uppercase, lowercase, numeric digit, and special symbol. Passwords checked against known breach dictionaries (HaveIBeenPwned API integration ready).
2. **Multi-Device Session Architecture:**
   - A single user account can maintain multiple concurrent active sessions across distinct devices (e.g. Laptop, Mobile PWA, Tablet, Work Desktop).
   - Each login generates an isolated `UserSession` entity in the database with a unique `SessionId` (GUID) and a dedicated cryptographically random 64-byte refresh token.
   - Refresh tokens are stored strictly as **SHA-256 hashes** in the database to prevent token extraction if the database is read.
   - Logging in on a new device does **not** terminate or invalidate existing sessions on other devices.
3. **Session Expiration & Lifecycle Policy:**
   - **Access Token Expiration:** Short-lived JWT (15 minutes). Held in application memory; never stored in localStorage.
   - **Sliding Inactivity Expiration (7 Days):** Each successful API call using a refresh token updates `LastActiveAtUtc` and extends the sliding expiration window by 7 days. If a device remains inactive for 7 consecutive days, the session automatically expires.
   - **Absolute Session Expiration (30 Days):** Regardless of ongoing activity, an absolute cap (`AbsoluteExpiresAtUtc = CreatedAtUtc + 30 days`) forces full re-authentication every 30 days to re-verify financial authorization.
4. **Remote Session Revocation:**
   - Users can query active sessions via `GET /api/v1/auth/sessions` (returns Device Name, Type, IP, Last Active, "This Device" indicator).
   - Users can invoke `POST /api/v1/auth/sessions/{id}/revoke` to immediately terminate a lost or suspicious device session.
   - Users can invoke `POST /api/v1/auth/sessions/revoke-all-others` to invalidate all active refresh tokens except the caller's current session.
   - Revoked sessions reject subsequent refresh requests with `HTTP 401 Unauthorized` and trigger immediate local cache purge.
5. **Token Reuse & Compromise Detection:**
   - If an expired or already-rotated refresh token is presented (indicating a potential token replay attack), the system automatically revokes the entire `UserSession` family and logs a high-severity security audit event.
6. **Brute Force Defense & Lockout:**
   - Account lockout triggered after 5 consecutive failed login attempts within 10 minutes. Lockout duration: 15 minutes.
   - Optional TOTP-based Multi-Factor Authentication (MFA/2FA) utilizing standard RFC 6238 authenticator apps.

---

## 3. Authorization & Object-Level Access Control (IDOR / BOLA Defense)

Broken Object-Level Authorization (BOLA / IDOR) is the most critical vulnerability in financial systems. An authenticated user must never be able to view, query, or mutate another user's financial record simply by guessing or replacing a GUID parameter.

### 3.1 Tenancy & Data Isolation via Global Query Filters
The Entity Framework Core `ApplicationDbContext` configures global query filters on all user-scoped entities:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    // Enforce tenant isolation on all queries
    modelBuilder.Entity<Account>()
        .HasQueryFilter(e => !e.IsDeleted && e.UserId == _currentUserService.UserId);

    modelBuilder.Entity<Transaction>()
        .HasQueryFilter(e => !e.IsDeleted && e.UserId == _currentUserService.UserId);

    modelBuilder.Entity<CreditCard>()
        .HasQueryFilter(e => !e.IsDeleted && e.UserId == _currentUserService.UserId);

    modelBuilder.Entity<Investment>()
        .HasQueryFilter(e => !e.IsDeleted && e.UserId == _currentUserService.UserId);

    modelBuilder.Entity<Loan>()
        .HasQueryFilter(e => !e.IsDeleted && e.UserId == _currentUserService.UserId);
}
```

### 3.2 Explicit Handler Ownership Validation
In addition to global query filters, all Application Command/Query handlers explicitly evaluate ownership before mutations:

```csharp
public async Task<Result> Handle(UpdateTransactionCommand request, CancellationToken ct)
{
    var transaction = await _dbContext.Transactions
        .IgnoreQueryFilters() // Bypass filter to detect whether record exists under another user
        .FirstOrDefaultAsync(t => t.Id == request.TransactionId, ct);

    if (transaction == null)
        return Result.NotFound("Transaction not found.");

    if (transaction.UserId != _currentUserService.UserId)
    {
        _logger.LogWarning("BOLA ATTEMPT: User {UserId} attempted to mutate Transaction {TxId} owned by {OwnerId}",
            _currentUserService.UserId, transaction.Id, transaction.UserId);
        return Result.Forbidden("You do not have permission to access this resource.");
    }

    // Proceed with mutation...
}
```

---

## 4. Collaborative Guest Access & Secure Trip Links

Shared trips require seamless guest participation without compromising the host's private financial data.

```
       ┌────────────────────────────────────────────────────────┐
       │             GUEST ACCESS PERMISSION MATRIX             │
       ├────────────────────────┬───────────────┬───────────────┤
       │ Resource / Action      │ Trip Host     │ Trip Guest    │
       ├────────────────────────┼───────────────┼───────────────┤
       │ Host Personal Accounts │ Read / Write  │ NO ACCESS     │
       │ Host Investments & Net │ Read / Write  │ NO ACCESS     │
       │ Host Other Trips       │ Read / Write  │ NO ACCESS     │
       │ Current Trip Details   │ Read / Write  │ Read Only     │
       │ Current Trip Members   │ Read / Write  │ Read Only     │
       │ Current Trip Expenses  │ Read / Write  │ Read (+ Write*)│
       │ Current Trip Advances  │ Read / Write  │ Read Only     │
       │ Settlement Overview    │ Read / Write  │ Read Only     │
       └────────────────────────┴───────────────┴───────────────┘
       * Write permission granted only if Host enabled 'CanAddExpenses'
```

### 4.1 Cryptographic Token Architecture
- **Format:** High-entropy string generated using `RandomNumberGenerator.GetBytes(32)` (256 bits), encoded in URL-safe Base64.
- **Database Storage:** Raw tokens are **never** stored in plain text. The database stores the SHA-256 hash of the token (`TokenHash`).
- **Resolution Pipeline:**
  When a request arrives at `/trip/{tripId}/guest/{token}`:
  1. API hashes the incoming URL token with SHA-256.
  2. Looks up `TripMember` matching `TripId == tripId` and `GuestSecureTokenHash == hashedToken`.
  3. Verifies `TokenExpiresAtUtc > DateTime.UtcNow` and `!IsRevoked`.
  4. Generates an ephemeral ClaimsPrincipal with claims:
     - `ClaimTypes.Role` = `"TripGuest"`
     - `"TripId"` = `tripId`
     - `"MemberId"` = `member.Id`
     - `"CanAddExpense"` = `member.CanAddExpenses.ToString()`

### 4.2 Guest Isolation Guarantees
- Guest requests are blocked by policy from all `/api/v1/accounts`, `/api/v1/budgets`, `/api/v1/investments`, `/api/v1/loans`, and `/api/v1/analytics` endpoints.
- Guest access is confined to `/api/v1/trips/{tripId}/guest/*`.
- The trip host can instantly revoke guest access by rotating the token or clicking "Revoke Access" in the Trip Member UI.

---

## 5. API Security & Threat Defense

### 5.1 Input Validation & Strict Typing
- **Backend:** Every incoming DTO is validated via **FluentValidation** before entering application services. Null checks, character lengths, numeric bounds, and regex patterns are strictly enforced.
- **Frontend:** Forms validated using **Zod** schemas matching backend rules to give immediate feedback.
- **SQL Injection Prevention:** 100% of database queries use EF Core parameterized LINQ queries. Raw SQL string concatenation is strictly prohibited in code review guidelines.

### 5.2 Cross-Site Scripting (XSS) & Content Security Policy (CSP)
- All user-supplied text (notes, descriptions, merchant names) is treated as untrusted.
- React automatically escapes values rendered in JSX.
- HTTP Response Security Headers enforced on all endpoints:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' wss:; frame-ancestors 'none';
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  ```

### 5.3 Cross-Origin Resource Sharing (CORS)
- Wildcards (`*`) are strictly forbidden.
- Whitelist only specific allowed origins defined in configuration (e.g., `https://wealthflow.app`, `http://localhost:5173` for development).
- `AllowCredentials()` enabled only with explicit origin matching.

### 5.4 Rate Limiting & Denial of Service Defense
Utilizing .NET 9 built-in Rate Limiter middleware:
- **Authentication Endpoints (`/api/v1/auth/*`):** 5 requests per minute per IP.
- **Trip Guest Endpoints (`/api/v1/trips/*/guest/*`):** 30 requests per minute per IP.
- **General API Endpoints:** Sliding window of 100 requests per minute per authenticated user.
- **Sync Batch Endpoints:** 20 batch requests per minute per authenticated user.

---

## 6. File & Receipt Upload Security

Receipt uploads present attack vectors (malware, shell execution, zip bombs, path traversal).

```
┌───────────────────────────┐
│     Client Uploads File   │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│     API File Validator    │
│  1. Check File Extension  │  (Whitelist: .jpg, .jpeg, .png, .webp, .pdf)
│  2. Check Content-Type    │  (Match MIME type against extension)
│  3. Inspect Magic Bytes   │  (Verify JPEG: FF D8 FF, PNG: 89 50 4E 47, etc.)
│  4. Enforce Max Size      │  (Max 5 MB)
└─────────────┬─────────────┘
              │ PASS
              ▼
┌───────────────────────────┐
│     Storage Processor     │
│  - Rename to random GUID  │  (e.g., a81f4...-receipt.png)
│  - Strip EXIF / metadata  │
│  - Store outside web root │  (or Azure Blob / S3 Private Bucket)
│  - Save metadata in DB    │
└───────────────────────────┘
```

### 6.1 Download & Serving Security
- Files are served with header `Content-Disposition: attachment; filename="sanitized_name.ext"`.
- Header `X-Content-Type-Options: nosniff` prevents browser MIME sniffing.
- Files cannot be executed on the server filesystem.

---

## 7. Secrets Management & Cryptography

- **Secrets Storage:** Development uses `dotnet user-secrets`. Production uses environment variables injected via Azure Key Vault or Docker Secrets. **Zero secrets are committed to Git.**
- **Encryption in Transit:** TLS 1.3 mandatory.
- **Encryption at Rest:**
  - Database Transparent Data Encryption (TDE) active on PostgreSQL / Azure SQL.
  - Azure Storage Service Encryption (SSE) enabled on blob attachments.

---

## 8. Immutable Audit Logging

All state-altering actions generate an immutable record in the `AuditLog` table:
- **Fields Logged:** `Id`, `UserId`, `Action` (`Create`, `Update`, `Delete`, `Login`, `FailedLogin`, `PasswordReset`, `GuestTokenGenerated`, `GuestTokenRevoked`), `EntityName`, `EntityId`, `OldValuesJson`, `NewValuesJson`, `IpAddress`, `UserAgent`, `TimestampUtc`.
- **Tamper Resistance:** The `AuditLog` table has no `UPDATE` or `DELETE` API endpoints. In production, database user permissions restrict `AuditLog` to `INSERT` and `SELECT` only.

---

## 9. Offline & Client-Side Security

Because WealthFlow operates offline using IndexedDB:
1. **Local Storage Scoping:** Sensitive financial balances in IndexedDB are isolated to the origin (`https://wealthflow.app`).
2. **Session Termination (Logout):** When the user explicitly logs out, the frontend purges the active IndexedDB transaction cache and unregisters local encryption keys to prevent subsequent device users from reading financial data.
3. **Idempotency Replay Protection:** Replay attacks via intercepted offline sync requests are rejected using unique `IdempotencyKey` GUIDs validated against the server's processed history cache.

---

*End of Security and Access Specification.*

