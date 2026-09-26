# Authentication API

The endpoints below are mounted under `/api/auth`.

## Register

`POST /api/auth/register`

Request JSON:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "correct-horse"
}
```

On success, responds with HTTP `201`:

```json
{
  "token": "<JWT>",
  "user": {
    "id": "<user-id>",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "role": "user"
  }
}
```

## Login

`POST /api/auth/login`

Request JSON:

```json
{
  "email": "ada@example.com",
  "password": "correct-horse"
}
```

On success, responds with HTTP `200` and the same response shape as register.

## Errors

Errors use this JSON shape:

```json
{
  "error": "description of the problem"
}
```

Register returns HTTP `400` when required fields are missing, the email is invalid, or the password is shorter than six characters. It returns HTTP `409` when the email is already registered. Login returns HTTP `400` when email or password is missing and HTTP `401` when the credentials are invalid.

## Token and WebSocket authentication

`token` is a signed JSON Web Token (JWT) issued by the server. It expires after seven days. Set the `JWT_SECRET` environment variable to a strong, private secret before using the authentication endpoints. The token payload includes the user's `id` and `role`.

Pass the token in the WebSocket URL query string alongside the document ID:

```text
ws://<host>/<websocket-path>?docId=<document-id>&token=<JWT>
```

The WebSocket connection is rejected with close code `1008` if either query parameter is missing or the token is invalid or expired. After validation, the authenticated user ID is associated with that socket. The existing Yjs `sync` and `update` message formats remain unchanged.

## WebSocket Awareness messages

Clients send and receive Awareness updates using this JSON envelope:

```json
{
  "type": "awareness",
  "update": [1, 42, 1, 11, 123, 34, 117, 115, 101, 114, 34, 58, 123, 125, 125]
}
```

`update` is an array of bytes containing a standard `y-protocols/awareness` encoded update, not a JSON representation of the state. The binary data contains the client count followed by each client ID, clock, and JSON-encoded state. Clients send this envelope when their Awareness state changes.

The server relays an accepted update only to other sockets on the same document. A newly connected socket receives the current Awareness states in the same envelope when any are active. The server associates each client ID with the authenticated socket and user that first publishes its non-null state. Awareness is transient and is not written to SQLite. On disconnect, the server broadcasts an Awareness removal update for all active client IDs owned by that socket.

Example register request:

```sh
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Sailesh","email":"sailesh@example.com","password":"password123"}'
```

Example login request:

```sh
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sailesh@example.com","password":"password123"}'
```