# EAZY DON CHECK — Deployment

## Architecture
- Frontend: Vercel (`client/`)
- Backend: Render (`server/`)
- Database: MongoDB Atlas
- Media: Cloudinary
- Realtime: Socket.IO
- Calls: WebRTC with STUN/TURN

## Frontend environment
Set these in Vercel:

- `VITE_API_URL=https://YOUR-API-DOMAIN/api/v1`
- `VITE_SOCKET_URL=https://YOUR-API-DOMAIN`

## Backend environment
Set the variables in `server/.env.example` in Render. Never commit real secrets.

At minimum:
- `NODE_ENV=production`
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL=https://YOUR-FRONTEND-DOMAIN`

Configure the existing AI, Cloudinary, email, SMS and Paystack variables when those features are enabled.

For production WebRTC, configure `STUN_URLS` and a working TURN service using `TURN_URLS`, `TURN_USERNAME`, and `TURN_CREDENTIAL`.

## Build

Frontend:

    cd client
    npm ci
    npm run build

Backend:

    cd server
    npm ci
    npm start
