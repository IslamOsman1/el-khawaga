# Burger El Khawaga

Full-stack MERN restaurant ordering app for **Burger El Khawaga**.

The repository is split into:

- `client`: Vite + React frontend
- `server`: Express + MongoDB backend API

## Features

- Arabic RTL restaurant storefront
- Hero banners, menu sections, offers, wishlist, profile, and orders
- Admin dashboard for products, categories, banners, settings, and orders
- QR-based customer identity
- Image uploads with Cloudinary
- Google login
- Stripe online payment support
- Push notifications for orders and support updates
- Optional Twilio WhatsApp order notifications

## Tech Stack

- Frontend: React, Vite, React Router, Axios
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Media: Cloudinary
- Payments: Stripe
- Auth: JWT + Google

## Project Structure

```text
BURGER-ELKHAWAGA/
|- client/
|- server/
|- render.yaml
|- README.md
```

## Local Development

### 1. Install dependencies

From the repository root:

```bash
npm run install:all
```

### 2. Configure environment variables

Create local env files from the examples:

```bash
cd server
cp .env.example .env

cd ../client
cp .env.example .env
```

For local MongoDB you can use:

```env
MONGO_URI=mongodb://127.0.0.1:27017/burger-elkhawaga
```

### 3. Seed demo data

```bash
cd server
npm run seed
```

Demo admin account:

- Email: `admin@burgerelkhawaga.com`
- Password: `12345678`

### 4. Start the app

From the repository root:

```bash
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`

## Environment Variables

### Server

See [server/.env.example](server/.env.example).

Important values:

- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GOOGLE_CLIENT_ID`
- `STRIPE_SECRET_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `TWILIO_WHATSAPP_ORDER_ADMIN_TEMPLATE_SID`
- `TWILIO_WHATSAPP_ORDER_CUSTOMER_TEMPLATE_SID`

### Client

See [client/.env.example](client/.env.example).

Important values:

- `VITE_API_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`

## Deployment

Current recommended setup:

- Frontend on **Vercel**
- Backend on **Render**

You can also deploy both through the included [render.yaml](render.yaml).

### Frontend on Vercel

Recommended settings:

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `client`.
3. Framework preset: `Vite`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add env vars:
   - `VITE_API_URL=https://your-render-api.onrender.com/api`
   - `VITE_STRIPE_PUBLISHABLE_KEY=your_key`

Notes:

- [client/vercel.json](client/vercel.json) already contains the SPA rewrite.
- After deploying the frontend, set its URL as `CLIENT_URL` in the backend.

### Backend on Render

Recommended settings:

1. Create a new **Web Service**
2. Connect the repository
3. Set **Root Directory** to `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add env vars from [server/.env.example](server/.env.example)

Important production values:

- `PORT=10000`
- `NODE_ENV=production`
- `CLIENT_URL=https://your-frontend-domain.vercel.app`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`
- `GOOGLE_CLIENT_ID=...`
- `STRIPE_SECRET_KEY=...`
- `SMTP_HOST=...`
- `SMTP_PORT=2525`
- `SMTP_SECURE=false`
- `SMTP_USER=...`
- `SMTP_PASS=...`
- `EMAIL_FROM=Burger El Khawaga <your-email@example.com>`

Health check path:

- `/api/health`

### Render Blueprint

The repo includes [render.yaml](render.yaml) for a full Render deployment:

- `el-khawaga-api`
- `el-khawaga-web`

Before the first deploy, fill all required secrets in Render.

## Production Checklist

- Set a strong `JWT_SECRET`
- Use a production MongoDB database
- Set `CLIENT_URL` to the real frontend domain
- Set `VITE_API_URL` to the real backend API URL
- Configure Cloudinary production credentials
- Configure Stripe production keys
- Configure SMTP credentials
- Configure VAPID keys for browser push notifications
- Configure Twilio WhatsApp if you want automatic order alerts
- Do not commit real `.env` files

## Useful Commands

From the repository root:

```bash
npm run install:all
npm run dev
npm run start
```

From `server/`:

```bash
npm run dev
npm run start
npm run seed
```

From `client/`:

```bash
npm run dev
npm run build
npm run preview
```
