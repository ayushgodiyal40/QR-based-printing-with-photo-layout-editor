# 🖨️ PrintShop — QR File Upload & Print Management

A production-ready web application for local print/Xerox shops. Customers scan a QR code, upload files from their phones, select print options, and receive a token number — all without installing any app.

---

## ✨ Features

- 📱 **Mobile-first customer upload** — Scan QR → Upload → Get token in under 30 seconds
- 🖥️ **Admin dashboard** — Real-time order queue with live updates (SSE)
- 📄 **PDF & image support** — PDF, JPG, PNG, WEBP, HEIC
- 🖨️ **Print settings** — B&W/Color, A4/A3/Letter/Legal, copies, sides, orientation
- 🔔 **Real-time notifications** — New orders appear instantly without refresh
- 🔒 **Security** — Signed URLs, rate limiting, MIME validation, no public file paths
- 💰 **Pricing system** — Configurable per paper size/color mode/sides
- 📊 **Reports** — Daily/weekly/monthly with CSV export
- 🔗 **QR code** — Auto-generated, downloadable PNG
- 🗑️ **Auto file deletion** — After configurable retention period

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database (free options: [Neon](https://neon.tech), [Supabase](https://supabase.com))

### 2. Install

```bash
cd print-shop
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@host:5432/printshop
AUTH_SECRET=your-random-32-char-secret-here
```

### 4. Set Up Database

```bash
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. First-Time Setup

1. Go to `http://localhost:3000/setup`
2. Enter your shop name, admin email, and password
3. Click **Create Shop & Admin Account**
4. You'll be redirected to the admin dashboard

---

## 📱 Customer Flow

1. Customer scans QR code (displayed at shop counter)
2. Upload page opens on their phone
3. Select PDF/photos to upload
4. Choose B&W or Color, paper size, copies
5. Tap **Send for Printing**
6. Receive a 4-digit token number (e.g., **4827**)
7. Tell the operator the token
8. Track order status at `/order/ORDER_ID`

---

## 🖥️ Admin Flow

1. Log in at `/admin`
2. View live incoming orders on dashboard
3. Click any order to see files and settings
4. Preview or download files
5. Adjust print settings if needed
6. Change status: `Received → Waiting → Processing → Printing → Completed`
7. Files are automatically deleted after the retention period

---

## 🗺️ URL Structure

| URL | Description |
|-----|-------------|
| `/upload/[shopSlug]` | Customer upload page |
| `/order/[orderId]` | Customer order tracking |
| `/setup` | First-run setup wizard |
| `/admin` | Admin login |
| `/admin/dashboard` | Live order queue + stats |
| `/admin/orders` | Full order list |
| `/admin/orders/[id]` | Order detail + management |
| `/admin/printers` | Printer management |
| `/admin/pricing` | Pricing configuration |
| `/admin/settings` | Shop settings + QR code |
| `/admin/reports` | Reports + CSV export |

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | ✅ | App URL (no trailing slash) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Random secret (min 32 chars) |
| `UPLOAD_DIR` | ❌ | File storage directory (default: `./uploads`) |
| `MAX_FILE_SIZE_MB` | ❌ | Max file size in MB (default: 50) |
| `MAX_ORDER_SIZE_MB` | ❌ | Max total order size (default: 200) |
| `FILE_RETENTION_HOURS` | ❌ | Hours to keep files (default: 24) |

---

## 🗄️ Database Schema

Key tables:
- `shops` — Shop configuration
- `users` — Admin users (owner/operator roles)
- `orders` — Customer print orders
- `order_files` — Uploaded files per order
- `pricing_rules` — Per-shop pricing (paper × color × sides)
- `printers` — Shop printers
- `audit_logs` — Action history
- `order_notes` — Internal operator notes

---

## ☁️ Production Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Database
Use [Neon](https://neon.tech) free tier — paste the connection string as `DATABASE_URL`.

### File Storage
For production, upgrade from local disk to S3/Cloudflare R2 by replacing the storage adapter in `src/lib/storage.ts`.

---

## 🔒 Security

- Files stored with UUID filenames, not original names
- File access requires HMAC-signed tokens (15-min TTL)
- MIME type validated by magic bytes (not extension)
- Rate limiting: 10 orders/IP/hour, 30 files/IP/hour, 5 logins/IP/15min
- Admin sessions use httpOnly cookies
- Customers cannot access other customers' files (IDOR protected)

---

## 📝 License

MIT
