# WEALTHFLOW — PART 7: CLOUD DEPLOYMENT & PRODUCTION OPERATIONS GUIDE
**Document Version:** 1.0.0  
**Status:** Approved for Production  
**Target Environment:** Neon Serverless PostgreSQL + Render Docker Web Service + Vercel Edge Frontend  
**Storage Pairing:** Google Drive API v3 (PostgreSQL Deployment) with Automated Local Fallback  

> For the detailed directory version and assets, see [docs/07-deployment-and-operations-guide/README.md](./07-deployment-and-operations-guide/README.md).

---

## 1. Production Architecture Overview

WealthFlow is architected as an enterprise, decoupled, high-performance web system deployed across specialized cloud providers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      1. NEON POSTGRESQL (DATABASE)                      │
│            Serverless PostgreSQL 16 (AWS Region with SSL)               │
│                  - Auto-scaling compute & storage                       │
│                  - Automated connection pooling                         │
└────────────────────────────────────▲────────────────────────────────────┘
                                     │
                                     │ Encrypted TCP / SSL (Port 5432)
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                  2. RENDER: WEB SERVICE (BACKEND API)                   │
│           ASP.NET Core Web API (.NET 9+ / C# 13 Alpine Linux)           │
│                 Container: Unprivileged non-root user `app`              │
│                 Domain: https://wealthflow-api.onrender.com             │
│                 Health Probes: /health/live, /health/ready              │
└────────────────────────────────────▲────────────────────────────────────┘
                                     │
                                     │ HTTPS / WSS SignalR (Strict CORS)
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                     3. VERCEL: PWA (FRONTEND CLIENT)                    │
│             React 19 + TypeScript + Vite + Tailwind CSS v4              │
│                 Distribution: Global Vercel Edge CDN                    │
│                 Domain: https://wealthflow.vercel.app                   │
│                 Routing: Client-side SPA Rewrites via vercel.json       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Step 1: Provisioning Neon Serverless PostgreSQL

Neon provides instant, serverless PostgreSQL with automated compute scaling and built-in connection pooling.

1. **Sign Up / Log In:**
   - Navigate to [neon.tech](https://neon.tech) and authenticate.
2. **Create New Project:**
   - Project Name: `wealthflow`
   - Postgres Version: `16` (Default)
   - Cloud Service Provider & Region: Select the region nearest your users/API (e.g. `AWS US East (Ohio)` or `AWS Europe (Frankfurt)`).
3. **Retrieve Connection String:**
   - In the project dashboard under **Connection Details**, locate your database URI.
   - Example URI:
     ```
     postgresql://alex:AbCdEf123456@ep-cool-forest-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
4. **Format for ASP.NET Npgsql:**
   - Convert the connection parameters to standard key-value configuration:
     ```
     Host=ep-cool-forest-123456.us-east-2.aws.neon.tech;Port=5432;Database=neondb;Username=alex;Password=AbCdEf123456;SSL Mode=Require;Trust Server Certificate=true
     ```

---

## 3. Step 2: Deploying Backend API on Render

Render builds and runs the production multi-stage `.NET 9` Docker container in an isolated, non-root Alpine sandbox.

1. **Create Web Service:**
   - Log in to [render.com](https://render.com).
   - Click **New +** ➔ **Web Service**.
   - Connect your GitHub repository: `RahulBhola/WealthFlow`.
2. **Configure Service Details:**
   - **Name:** `wealthflow-api`
   - **Region:** Pick the same region as your Neon database (e.g. `Ohio (US East)`).
   - **Branch:** `main`
   - **Language / Runtime:** **Docker**
   - **Root Directory:** *(Leave empty - uses repository root)*
   - **Dockerfile Path:** `./backend/Dockerfile`
   - **Instance Type:** **Free** (or Starter/Standard for continuous uptime)
3. **Configure Environment Variables:**
   Click **Add Environment Variable** and enter the following keys:

   | Key | Example Value | Description |
   |---|---|---|
   | `ASPNETCORE_ENVIRONMENT` | `Production` | Activates production error handling & caching |
   | `DatabaseProvider` | `PostgreSQL` | Directs EF Core to instantiate Npgsql provider |
   | `ConnectionStrings__DefaultConnection` | `Host=...;SSL Mode=Require;...` | Your Neon PostgreSQL connection string |
   | `AutoInitDatabase` | `true` | Automatically provisions all 23 database tables and singleton admin on startup |
   | `CORS_ALLOWED_ORIGINS` | `*` | Or specify your Vercel frontend URL: `https://wealthflow.vercel.app` |
   | `Jwt__Secret` | `WealthFlowSuperSecretKeyMustBeAtLeast32BytesLongProduction!` | Cryptographic key for signing HS256 tokens (min 32 chars) |
   | `Jwt__Issuer` | `WealthFlow` | Authoritative token issuer |
   | `Jwt__Audience` | `WealthFlowClient` | Authorized audience |
   | `StorageProvider` | `GoogleDrive` | Pairing provider (gracefully falls back to local uploads if keys absent) |

4. **Deploy & Validate:**
   - Click **Deploy Web Service**.
   - Build completes in approximately 2 minutes.
   - Once deployed, copy your service URL: `https://wealthflow-api.onrender.com`.
   - **Smoke Test Readiness Endpoint:**
     Open `https://wealthflow-api.onrender.com/health/ready` in your browser. Expected response:
     ```json
     {
       "status": "Healthy",
       "totalDuration": "00:00:00.015",
       "entries": [
         {
           "name": "database",
           "status": "Healthy",
           "duration": "00:00:00.014"
         }
       ]
     }
     ```

---

## 4. Step 3: Deploying Frontend PWA on Vercel

Vercel serves the static React 19 bundle over an ultra-low-latency global Edge CDN with zero cold starts.

1. **Import Project:**
   - Log in to [vercel.com](https://vercel.com).
   - Click **Add New...** ➔ **Project**.
   - Select `RahulBhola/WealthFlow` and click **Import**.
2. **Configure Project Settings:**
   - **Project Name:** `wealthflow`
   - **Framework Preset:** **Vite** *(Automatically detected)*
   - **Root Directory:** Click **Edit** ➔ select **`frontend`** ➔ click **Continue**.
3. **Environment Variables:**
   - Add **`VITE_API_URL`**: `https://wealthflow-api.onrender.com` *(Use your Render API URL from Step 2 without trailing slash)*
4. **Deploy:**
   - Click **Deploy**.
   - In ~45 seconds, the build succeeds and assigns your production domain: `https://wealthflow.vercel.app`.
5. **SPA Routing Verification:**
   - The repository includes [frontend/vercel.json](file:///d:/Projects/WealthFlow/frontend/vercel.json):
     ```json
     {
       "rewrites": [
         {
           "source": "/(.*)",
           "destination": "/index.html"
         }
       ]
     }
     ```
   - This ensures refreshing deep links (e.g. `/dashboard`, `/accounts`, `/trips/some-id`, `/admin`) correctly hands off to React Router rather than throwing 404s.

---

## 5. Step 4: Configuring Google Drive Cloud Storage (Receipts & Attachments)

Under PostgreSQL deployment mode, attachment uploads route to Google Drive API v3 via a dedicated Service Account.

> [!NOTE]
> WealthFlow contains an automated local storage fallback. If Google Drive credentials are omitted, uploads will safely persist in `/app/App_Data/uploads/` on the server without breaking the application.

To route uploads directly to your private Google Drive:

1. **Create Google Cloud Project:**
   - Visit [Google Cloud Console](https://console.cloud.google.com).
   - Create a project: `WealthFlow-Cloud`.
2. **Enable Drive API:**
   - Navigate to **APIs & Services** ➔ **Library**.
   - Search for **Google Drive API** and click **Enable**.
3. **Create Service Account:**
   - Go to **IAM & Admin** ➔ **Service Accounts** ➔ **Create Service Account**.
   - Name: `wealthflow-storage`.
   - Copy the generated email: `wealthflow-storage@wealthflow-cloud.iam.gserviceaccount.com`.
4. **Generate JSON Key:**
   - Click the created Service Account ➔ **Keys** tab ➔ **Add Key** ➔ **Create new key** ➔ Select **JSON**.
   - Save the downloaded `.json` file securely.
5. **Create & Share Private Drive Folder:**
   - In your personal Google Drive, create a folder: `WealthFlow Receipts`.
   - Right-click folder ➔ **Share** ➔ paste the Service Account email.
   - Grant role: **Editor** ➔ uncheck "Notify people" ➔ click **Share**.
   - Copy the Folder ID from your browser URL:
     `drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ` ➔ `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`.
6. **Set Environment Variables on Render:**
   In your `wealthflow-api` Web Service settings, add:
   - `GoogleDrive__RootFolderId`: `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`
   - `GoogleDrive__ServiceAccountKeyJson`: *(Paste the entire contents of the downloaded JSON key file)*

---

## 6. Step 5: Local Execution Runbook

For offline testing or local development:

### Method A: Full Multi-Container Docker Compose
```bash
docker-compose up --build
```
- **Postgres 16:** `localhost:5432`
- **Backend API:** `localhost:8080`
- **Frontend PWA:** `localhost:80`
- Web app accessible at: `http://localhost`

### Method B: Native Process Execution
1. **Backend:**
   ```powershell
   dotnet run --project backend/src/WealthFlow.Api
   ```
   *(Listens on `http://localhost:5000` / `https://localhost:5001` with In-Memory DB & auto-seed)*
2. **Frontend:**
   ```powershell
   cd frontend
   npm run dev
   ```
   *(Listens on `http://localhost:5173`)*

---

## 7. Step 6: Credentials & Acceptance Testing Checklist

### Authoritative Seed Credentials

| Role | Email | Password | Allowed Access |
|---|---|---|---|
| **Singleton Admin** | `admin@wealthflow.local` | `Admin@123456` | Full ERP Console (`/admin`), System Monitor, Audit Trail |
| **Universal Test User** | `test@wealthflow.local` | `Test@123456` | Personal Finance, Accounts, Budgets, Trips, Investments |
| **New User** | *(Register via `/register`)* | *(User-defined)* | Full isolated personal finance workspace |

### Production Acceptance Checklist

- [ ] **Database Connectivity:** `GET /health/ready` returns HTTP 200 with `status: "Healthy"`.
- [ ] **Admin Invariant (`AdminCount = 1`):** Log in as `admin@wealthflow.local` and visit `/admin`. Verify the Command Center displays active database health and singleton admin verification.
- [ ] **Zero-Trust Depository Boundary:** Add a bank account (e.g. "HDFC Salary") with opening balance ₹50,000. Verify account mask format `•••• •••• 4821`.
- [ ] **Immutable Transaction Ledger:** Record an expense. Verify instant balance recalculation and budget alert tracking.
- [ ] **Attachment Upload & Proxy:** Attach a receipt (JPEG/PNG/PDF) to a transaction. Test streaming download via `GET /api/v1/attachments/{id}/download`. Verify magic-byte validation rejects spoofed files.
- [ ] **Full Data Portability:** Navigate to Settings ➔ Export Data. Confirm instantaneous download of complete JSON schema backup and transaction CSV.
- [ ] **Collaborative Trips & Settlement:** Create a group trip with 3 members, log expenses, and execute pure informational greedy debt minimization.
