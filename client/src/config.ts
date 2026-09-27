/**
 * Centralized API and WebSocket URL configuration.
 *
 * - In development (HTTP on localhost): uses http://localhost:4000 for REST
 *   and ws://localhost:4000/ws for WebSocket.
 * - In production (same-origin deploy): uses relative /api paths for REST
 *   and wss://<current-host>/ws for WebSocket.
 */

const isDev =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

/** Base URL for REST API calls (no trailing slash). */
export const API_BASE = isDev ? 'http://localhost:4000' : '';

/** Full WebSocket endpoint URL including the /ws path. */
export const WS_URL = isDev
  ? 'ws://localhost:4000/ws'
  : `wss://${window.location.host}/ws`;
