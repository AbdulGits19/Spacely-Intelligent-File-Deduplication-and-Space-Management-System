# 💎 Spacely Core
**Intelligent File Deduplication & Storage Optimization System**

An enterprise-grade, full-stack application designed to detect, group, and safely eliminate redundant files. Pristine Vault utilizes memory-safe cryptographic hashing and a background task engine to optimize storage space without compromising data integrity.

---

## 🎯 Objective
As digital environments grow, storage bloat becomes inevitable. The objective of Pristine Vault is to provide a secure, highly visual, and automated way to identify identical files across a system regardless of their filenames. By utilizing 64 KB chunked SHA-256 hashing, the system can process gigabytes of data without spiking RAM, presenting users with a clear path to reclaim wasted space safely.

---

## 🏗️ System Workflow & Architecture

1. **Secure Ingestion:** Users upload multiple files via the React frontend.
2. **Chunked Streaming:** The FastAPI backend streams the upload directly to disk in 64 KB chunks, ensuring the server's RAM remains stable even during massive file uploads.
3. **Asynchronous Hashing:** FastAPI immediately responds with a `202 Accepted` and pushes a hashing job to a Redis message broker. 
4. **Cryptographic Processing:** A Celery background worker picks up the job, calculates the exact SHA-256 signature (also using 64 KB chunking), and updates the MySQL database.
5. **Intelligent Grouping:** Files with identical SHA-256 signatures are grouped. The oldest file is flagged as the "Original Reference", and the rest are flagged as "Duplicates".
6. **Safe Remediation:** The frontend dashboard visualizes the wasted space and provides a 2-step Safe Deletion flow, incorporating a "Protection Lock" feature to prevent accidental deletion of critical files.

---

## 🛠️ Technology Stack

**Frontend:**
* React 18 + Vite (TypeScript)
* Material UI (MUI) v5
* Chart.js & React-Chartjs-2
* Dual-Theme Engine (Mulberry Dark `#0D1310` & Botanical Light `#F0FFF0`)

**Backend:**
* Python 3.12 + FastAPI
* SQLAlchemy (ORM) + Alembic (Migrations)
* Pydantic (Data Validation) + Passlib/Bcrypt (Security)
* Celery (Distributed Task Queue)

**Infrastructure:**
* MySQL 8.0 (Relational Database)
* Redis 7.2 (Message Broker & Cache)
* Docker & Docker Compose

---

## 🚀 Getting Started

### 1. Unpack the Project
Extract the project archive or clone the repository to your local machine.
```bash
git clone <repository-url>
cd Pristine-Vault

```

### 2. Configure Environment Variables

Ensure you have a `.env` file in the root directory (or inside your backend folder) with the following basic configuration:

```ini
MYSQL_USER=dedup_user
MYSQL_PASSWORD=dedup_password_123
MYSQL_ROOT_PASSWORD=root_password_123
MYSQL_DB=file_dedup_db
SECRET_KEY=your_super_secret_jwt_key

```

### 3. Spin Up the Infrastructure (Database & Redis)

Ensure Docker Desktop is running, then start the containerized infrastructure:

```bash
docker compose up -d db redis

```

*(Note: If your entire application is containerized, simply run `docker compose up -d --build` to launch everything at once).*

### 4. Start the Backend API & Celery Worker

Open two separate terminals for the backend services.

**Terminal A (FastAPI Server):**

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1    # (Or source venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

```

**Terminal B (Celery Worker):**

```bash
cd backend
.\venv\Scripts\Activate.ps1
celery -A app.worker.celery_app worker --loglevel=info --pool=solo

```

### 5. Start the React Frontend

Open a third terminal for the UI:

```bash
cd frontend
npm install
npm run dev

```

Navigate to **`http://localhost:5173`** in your browser.

---

## 🧭 Navigation & Features

* **Authentication (`/login`, `/register`):** Secure JWT-based access. New workspaces can be initialized instantly.
* **Storage Analytics (`/dashboard`):** Real-time Chart.js doughnut and bar charts visualizing storage consumption, deduplication savings, and the top 5 largest files in the vault.
* **File Explorer (`/files`):** Drag-and-drop file ingestion. Includes advanced filtering (by duplicate status, extension, and date) and a cryptographic inspector modal.
* **Duplicate Clusters (`/duplicates`):** Review grouped identical files. Use the **Safe Delete** preview to see exactly how many bytes will be reclaimed before execution.
* **Deletion Ledger (`/history`):** An immutable audit trail of all securely wiped files and total lifetime space reclaimed.
* **Settings (`/settings`):** Toggle between the "Velvet Mulberry" and "Hint of Green" aesthetic themes and verify real-time backend API health.

---

## 🔒 Security & Data Integrity

* **Bcrypt Hashing:** Passwords are mathematically secured before database insertion.
* **File Protection:** Any file can be explicitly "Protected" via the UI, rendering it impossible to delete through the API or Safe Cleanup flows until manually unlocked.
* **Atomic Deletions:** Database records and physical file unlinking occur synchronously to prevent orphaned data.