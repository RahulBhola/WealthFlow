# WEALTHFLOW — PART 7: CLOUD DEPLOYMENT & PRODUCTION OPERATIONS GUIDE
**Document Version:** 1.1.0  
**Status:** Approved for Production  
**Target Environment:** Neon Serverless PostgreSQL + Render Docker Web Service + Vercel Edge Frontend  
**Storage Pairing:** Google Drive API v3 (PostgreSQL Deployment) with Automated Local Fallback  

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

## 2. Step 1: Neon Serverless PostgreSQL (COMPLETED ✅)

- **Project:** `wealthflow`
- **Region:** `AWS US East 2 (Ohio)`
- **Database:** `neondb`
- **Connection String:**
  ```text
  Host=ep-ancient-voice-b59rhw6g-pooler.c-7.us-east-2.aws.neon.tech;Port=5432;Database=neondb;Username=neondb_owner;Password=npg_QwxN5p0kin2A;SSL Mode=Require;Trust Server Certificate=true;
  ```

---

## 3. Step 2: Deploying Backend API on Render (EXACT CONFIGURATION)

### 3.1 Service Setup in Render Dashboard
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** ➔ **Web Service**.
2. Select your repository: **`RahulBhola/WealthFlow`**.
3. Configure the service settings:
   - **Name:** `wealthflow-api`
   - **Region:** **`Ohio (US East)`** *(Matches your Neon database region for sub-millisecond query latency)*
   - **Branch:** `main`
   - **Language / Runtime:** **`Docker`**
   - **Root Directory:** *(Leave completely empty — uses repo root)*
   - **Dockerfile Path:** `./backend/Dockerfile`
   - **Instance Type:** **Free**

---

### 3.2 Exact Environment Variables (Copy & Paste)

In the **Environment Variables** section on Render, add these exact keys and values:

| Key | Exact Value | Purpose |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` | Enables production mode & optimized caching |
| `DatabaseProvider` | `PostgreSQL` | Directs EF Core to instantiate Npgsql provider |
| `ConnectionStrings__DefaultConnection` | `Host=ep-ancient-voice-b59rhw6g-pooler.c-7.us-east-2.aws.neon.tech;Port=5432;Database=neondb;Username=neondb_owner;Password=npg_QwxN5p0kin2A;SSL Mode=Require;Trust Server Certificate=true;` | Your live Neon pooled database connection |
| `AutoInitDatabase` | `true` | Automatically provisions all 23 database tables, indexes, and singleton admin on first boot |
| `CORS_ALLOWED_ORIGINS` | `*` | Allows browser API calls from your Vercel frontend |
| `Jwt__Secret` | `WealthFlowSuperSecretKeyMustBeAtLeast32BytesLongProduction!` | Cryptographic secret for signing JWTs (min 32 chars) |
| `Jwt__Issuer` | `WealthFlow` | Authoritative token issuer |
| `Jwt__Audience` | `WealthFlowClient` | Authorized client audience |
| `StorageProvider` | `GoogleDrive` | Cloud file storage (safely uses built-in local fallback until Google keys are added) |
| `DefaultAdmin__Email` | `admin@wealthflow.local` | Default singleton Admin username |
| `DefaultAdmin__Password` | `Admin@123456` | Default singleton Admin password |

---

### 3.3 Deploy & Verify
1. Click **Deploy Web Service** (or **Create Web Service**).
2. Render will build the multi-stage Alpine Docker container (`mcr.microsoft.com/dotnet/aspnet:9.0-alpine`).
3. Once the build completes (~2 minutes), Render assigns your API URL:
   `https://wealthflow-api.onrender.com`
4. **Health Check Verification:**
   Open this URL in your browser:
   ```
   https://wealthflow-api.onrender.com/health/ready
   ```
   Expected HTTP 200 response:
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
   Add this single environment variable:

   | Key | Value | Notes |
   |---|---|---|
   | `VITE_API_URL` | `https://wealthflow-api.onrender.com` | Use your Render API URL from Step 2 (without trailing slash) |

4. **Deploy:**
   - Click **Deploy**.
   - Vercel builds the app in ~45 seconds and assigns your domain: `https://wealthflow.vercel.app`.
5. **SPA Routing Verification:**
   - [frontend/vercel.json](../frontend/vercel.json) handles client-side rewrites automatically to `/index.html`, ensuring URLs like `/dashboard`, `/accounts`, `/trips`, and `/admin` reload seamlessly.

---

## 5. Step 4: Configuring Google Drive Cloud Storage (Receipts & Attachments)

> [!NOTE]
> WealthFlow includes an automatic local storage fallback. The application is **100% functional out of the box** without Google Drive keys. When you are ready to link your private Google Drive:

1. In [Google Cloud Console](https://console.cloud.google.com), create a project and enable **Google Drive API v3**.
2. Go to **IAM & Admin** ➔ **Service Accounts** ➔ Create `wealthflow-storage`.
3. Go to the **Keys** tab ➔ **Add Key** ➔ **Create new key** ➔ **JSON** (downloads `service-account.json`).
4. In personal Google Drive, create a folder: `WealthFlow Receipts`.
5. Share the folder with the Service Account email as **Editor**.
6. Copy the Folder ID from the URL (`drive.google.com/drive/folders/<FOLDER_ID>`).
7. In **Render** (Environment Variables for `wealthflow-api`), add:
   - `GoogleDrive__RootFolderId`: `<FOLDER_ID>`
   - `GoogleDrive__ServiceAccountKeyJson`: `<Paste the entire text contents of the service-account.json file>`

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
2. **Frontend:**
   ```powershell
   cd frontend
   npm run dev
   ```
   *(Listens on `http://localhost:5173`)*

---

## 7. Step 6: Authoritative Credentials & Verification Checklist

### Pre-Seeded Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Singleton Admin** | `admin@wealthflow.local` | `Admin@123456` | Full ERP Console (`/admin`), Security Monitors, Audit Trail |
| **New User** | *(Register via `/register`)* | *(Your choice)* | Personal finance, accounts, budgets, trips, investments |

### Production Smoke Test Checklist

- [ ] **Database Readiness:** Open `https://wealthflow-api.onrender.com/health/ready` ➔ verify HTTP 200 `Healthy`.
- [ ] **Admin Invariant:** Log in as `admin@wealthflow.local` ➔ visit `/admin` ➔ verify Singleton Admin Monitor (`AdminCount = 1`).
- [ ] **Banking Masking:** Add an account with ₹50,000 opening balance ➔ verify masked account number (`•••• •••• 4821`).
- [ ] **Transaction Flow:** Add an expense ➔ verify real-time balance recalculation and budget alert tracking.
- [ ] **Receipt Upload:** Upload a receipt attachment ➔ test streaming proxy download (`/api/v1/attachments/{id}/download`).
- [ ] **Data Export:** Visit Settings ➔ Export Data ➔ verify full JSON and CSV dumps.
