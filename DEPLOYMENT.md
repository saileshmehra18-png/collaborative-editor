# Deployment

The app can run as one Node service. The server serves the built frontend, the `/api` endpoints, and the `/ws` collaboration socket from the same host. Use a Node.js 20 or newer environment that supports persistent disk storage and WebSocket upgrades.

## Build and start

From the repository root, configure the service with:

- Install command: `npm run install:all`
- Build command: `npm run build`
- Start command: `npm start`

The server listens on the `PORT` supplied by the hosting provider (or `4000` locally). The build creates `client/dist` and `server/dist`; keep both available in the deployed release.

## Required production settings

- `NODE_ENV=production`
- `JWT_SECRET`: a unique, strong random value. For example, generate one with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
- `DATABASE_PATH`: a file path on the provider's persistent disk, such as `/var/data/app.db`.

SQLite data is stored at `DATABASE_PATH`; when it is unset, local development uses `server/data/app.db`. A deployment without persistent storage loses accounts and documents when its instance is replaced. This SQLite setup is intended for a single server instance; multiple replicas need a shared database and coordinated real-time state.

Set `CORS_ORIGIN` to a comma-separated list of exact frontend origins only when hosting the frontend on a different origin. Same-origin deployment does not need it. The WebSocket endpoint also requires a valid signed-in session token.

## Health check

Configure the hosting provider's HTTP health check to request `/api/health`. It returns `200` with `{"status":"ok"}` when the server is listening.
