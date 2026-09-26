# Deployment

The app can run as one Node service. The server serves the built frontend, the `/api` endpoints, and the `/ws` collaboration socket from the same host. Use a Node.js 20 or newer environment with PostgreSQL and WebSocket upgrade support.

## Build and start

From the repository root, configure the service with:

- Install command: `npm run install:all`
- Build command: `npm run build`
- Start command: `npm start`

The server listens on the `PORT` supplied by the hosting provider (or `4000` locally). The build creates `client/dist` and `server/dist`; keep both available in the deployed release.

## Required production settings

- `NODE_ENV=production`
- `JWT_SECRET`: a unique, strong random value. For example, generate one with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
- `DATABASE_URL`: a PostgreSQL connection string. On Render, use the database's internal URL and place the service and database in the same region.

The PostgreSQL schema is initialized from `server/src/db/schema.sql` when the server starts. PostgreSQL stores user accounts and document/Yjs updates. This deployment is intended for one server instance because live Yjs documents and Awareness state are held in memory; multiple replicas would need coordinated real-time state.

Set `CORS_ORIGIN` to a comma-separated list of exact frontend origins only when hosting the frontend on a different origin. Same-origin deployment does not need it. The WebSocket endpoint also requires a valid signed-in session token.

Render's Free Postgres plan has a 1 GB storage limit and expires after 30 days. Free Web Services have ephemeral filesystems and may sleep when idle, so PostgreSQL must be used for persistent account and document data.

## Health check

Configure the hosting provider's HTTP health check to request `/api/health`. It returns `200` with `{"status":"ok"}` when the server is listening.
