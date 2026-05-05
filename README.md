# Al Wekala Market

Full-stack MERN e-commerce project for a grocery / supermarket style store.

The repository is split into:

- `client`: Vite + React frontend
- `server`: Express + MongoDB backend API

## Highlights

- Arabic RTL storefront with dark / light theme toggle
- Home slider, featured categories, offers, wishlist, profile, orders, and category pages
- Admin dashboard for products, category groups, sections, banners, featured categories, store settings, payment settings, and orders
- Image uploads through Cloudinary
- Social login with Google and Facebook
- Online payment support with Stripe Checkout
- Central store settings that control large parts of the frontend from the dashboard

## Tech Stack

- Frontend: React, Vite, React Router, Axios
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Media: Cloudinary
- Payments: Stripe
- Auth: JWT + Google + Facebook

## Project Structure

```text
alwekala-ecommerce/
|- client/
|- server/
|- render.yaml
```

## Local Development

### 1. Install dependencies

```bash
npm run install:all
```

Or install each app separately:

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

Create local env files from the examples:

```bash
cd server
cp .env.example .env

cd ../client
cp .env.example .env
```

### 3. Seed the demo admin account

```bash
cd server
npm run seed
```

Demo admin account:

- Email: `admin@alwekala.com`
- Password: `12345678`

### 4. Start the project

Run both apps from the repository root:

```bash
npm run dev
```

Or run them separately:

```bash
cd server
npm run dev

cd ../client
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
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `STRIPE_SECRET_KEY`

### Client

See [client/.env.example](client/.env.example).

Important values:

- `VITE_API_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`

## Deployment

This repository is prepared for a split deployment:

- Frontend on Vercel
- Backend on Render

You can also deploy both frontend and backend on Render using the included `render.yaml`.

### Option 1: Frontend on Vercel

The frontend is ready for Vercel through [client/vercel.json](client/vercel.json).

Recommended setup:

1. Import the GitHub repository into Vercel.
2. Set the project root directory to `client`.
3. Framework preset: `Vite`.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables:
   - `VITE_API_URL=https://your-render-api.onrender.com/api`
   - `VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key`

Notes:

- The Vercel config includes an SPA rewrite so React Router routes work after refresh.
- After deployment, copy the Vercel frontend URL and use it as `CLIENT_URL` in the backend.

### Option 2: Backend on Render

The backend is ready for Render as a Node web service:

1. Create a new Render Web Service.
2. Connect this repository.
3. Set `Root Directory` to `server`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables from [server/.env.example](server/.env.example)

Important Render backend values:

- `PORT=10000`
- `NODE_ENV=production`
- `CLIENT_URL=https://your-frontend-domain.vercel.app`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`
- `GOOGLE_CLIENT_ID=...`
- `FACEBOOK_APP_ID=...`
- `FACEBOOK_APP_SECRET=...`
- `STRIPE_SECRET_KEY=...`

Health check path:

- `/api/health`

### Option 3: Full Render deployment with Blueprint

This repository includes [render.yaml](render.yaml) for Render Blueprint deployment.

It creates:

- A Node web service for the backend
- A static site for the frontend

Before the first production deploy, fill in the prompted environment variables in Render:

- Backend:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `CLIENT_URL`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `FACEBOOK_APP_ID`
  - `FACEBOOK_APP_SECRET`
  - `STRIPE_SECRET_KEY`
- Frontend:
  - `VITE_API_URL`
  - `VITE_STRIPE_PUBLISHABLE_KEY`

## Production Checklist

- Set a strong `JWT_SECRET`
- Use production MongoDB credentials
- Set `CLIENT_URL` to the real frontend domain
- Set `VITE_API_URL` to the real backend API URL
- Configure Cloudinary production credentials
- Configure Stripe production keys
- Add your production domains in Google and Facebook app settings
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
