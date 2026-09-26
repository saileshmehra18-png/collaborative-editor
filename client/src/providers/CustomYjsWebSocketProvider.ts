import * as Y from 'yjs';
import {
    applyAwarenessUpdate,
    Awareness,
    encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import { getAuthSession } from '../auth/authStorage';

export type ProviderStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type ProviderSyncStatus = 'idle' | 'offline' | 'syncing' | 'synced';

type ProviderMessage =
    | { type: 'sync' | 'update' | 'awareness'; update: number[] }
    | { type: 'ack'; id: number };

function isProviderMessage(value: unknown): value is ProviderMessage {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const message = value as Record<string, unknown>;
    if (message.type === 'ack') {
        return Number.isSafeInteger(message.id);
    }

    return (
        (message.type === 'sync' || message.type === 'update' || message.type === 'awareness') &&
        Array.isArray(message.update) &&
        message.update.every(
            (byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255,
        )
    );
}

export class CustomYjsWebSocketProvider {
    ws: WebSocket | null = null;
    readonly awareness: Awareness;
    status: ProviderStatus = 'connecting';
    onStatusChange?: (status: ProviderStatus) => void;
    onOfflineEditCountChange?: (count: number) => void;
    onSyncStatusChange?: (status: ProviderSyncStatus) => void;
    syncStatus: ProviderSyncStatus = 'idle';
    offlineMode = false;
    offlineEditCount = 0;

    private destroyed = false;
    private awarenessDestroyed = false;
    private endpoint: URL | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempt = 0;
    private nextUpdateId = 0;
    private readonly pendingUpdateIds = new Set<number>();

    constructor(
        private readonly doc: Y.Doc,
        docId: string,
        onStatusChange?: (status: ProviderStatus) => void,
        onOfflineEditCountChange?: (count: number) => void,
        onSyncStatusChange?: (status: ProviderSyncStatus) => void,
    ) {
        this.onStatusChange = onStatusChange;
        this.onOfflineEditCountChange = onOfflineEditCountChange;
        this.onSyncStatusChange = onSyncStatusChange;
        this.awareness = new Awareness(this.doc);
        this.awareness.on('update', this.handleAwarenessUpdate);

        const token = getAuthSession()?.token;
        if (!token) {
            this.setStatus('error');
            return;
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const endpoint = new URL(`${wsProtocol}//${window.location.host}/ws`);
        endpoint.searchParams.set('docId', docId);
        endpoint.searchParams.set('token', token);
        this.endpoint = endpoint;

        this.doc.on('update', this.handleDocumentUpdate);
        this.connect();
    }

    setOfflineMode(offlineMode: boolean): void {
        if (this.destroyed || this.offlineMode === offlineMode) {
            return;
        }

        this.offlineMode = offlineMode;
        this.pendingUpdateIds.clear();

        if (offlineMode) {
            if (this.reconnectTimer !== null) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            this.setSyncStatus('offline');
            const ws = this.ws;
            this.ws = null;
            ws?.removeEventListener('open', this.handleOpen);
            ws?.removeEventListener('message', this.handleMessage);
            ws?.removeEventListener('close', this.handleClose);
            ws?.removeEventListener('error', this.handleError);
            if (
                ws &&
                (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)
            ) {
                ws.close();
            }
            this.setStatus('disconnected');
            return;
        }

        this.reconnectAttempt = 0;
        this.setSyncStatus('syncing');
        this.setStatus('connecting');
        this.connect();
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }

        this.doc.off('update', this.handleDocumentUpdate);
        this.cleanupAwareness(true);
        this.destroyed = true;
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        const ws = this.ws;
        ws?.removeEventListener('open', this.handleOpen);
        ws?.removeEventListener('message', this.handleMessage);
        ws?.removeEventListener('close', this.handleClose);
        ws?.removeEventListener('error', this.handleError);
        this.ws = null;
        if (
            ws &&
            (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)
        ) {
            ws.close();
        }

        this.setStatus('disconnected');
    }

    private readonly handleDocumentUpdate = (update: Uint8Array, origin: unknown): void => {
        if (origin === this) {
            return;
        }

        if (this.offlineMode) {
            this.offlineEditCount += 1;
            this.onOfflineEditCountChange?.(this.offlineEditCount);
            return;
        }

        this.sendUpdate(update);
    };

    private readonly handleOpen = (event: Event): void => {
        if (event.currentTarget !== this.ws || this.destroyed || this.offlineMode) {
            return;
        }

        this.reconnectAttempt = 0;
        this.setStatus('connected');
        this.setSyncStatus('syncing');
        this.sendUpdate(Y.encodeStateAsUpdate(this.doc));
        if (this.awareness.getLocalState() !== null) {
            this.sendAwarenessUpdate([this.awareness.clientID]);
        }
    };

    private readonly handleMessage = (event: MessageEvent): void => {
        if (event.currentTarget !== this.ws || typeof event.data !== 'string') {
            return;
        }

        try {
            const message: unknown = JSON.parse(event.data);
            if (!isProviderMessage(message)) {
                return;
            }

            if (message.type === 'ack') {
                const acknowledged = this.pendingUpdateIds.delete(message.id);
                if (
                    acknowledged &&
                    this.pendingUpdateIds.size === 0 &&
                    this.ws?.readyState === WebSocket.OPEN &&
                    !this.offlineMode
                ) {
                    this.setSyncStatus('synced');
                }
                return;
            }

            const update = Uint8Array.from(message.update);
            if (message.type === 'awareness') {
                applyAwarenessUpdate(this.awareness, update, this);
            } else {
                Y.applyUpdate(this.doc, update, this);
            }
        } catch {
            this.setStatus('error');
        }
    };

    private readonly handleClose = (event: CloseEvent): void => {
        const ws = event.currentTarget as WebSocket;
        if (ws !== this.ws) {
            return;
        }

        ws.removeEventListener('open', this.handleOpen);
        ws.removeEventListener('message', this.handleMessage);
        ws.removeEventListener('close', this.handleClose);
        ws.removeEventListener('error', this.handleError);
        this.ws = null;
        this.pendingUpdateIds.clear();
        this.setStatus('disconnected');
        this.setSyncStatus('idle');
        this.scheduleReconnect();
    };

    private readonly handleError = (event: Event): void => {
        const ws = event.currentTarget as WebSocket;
        if (ws !== this.ws || this.destroyed || this.offlineMode) {
            return;
        }

        this.setStatus('error');
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    };

    private connect(): void {
        if (this.destroyed || this.offlineMode || !this.endpoint) {
            return;
        }
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
            return;
        }

        try {
            this.ws = new WebSocket(this.endpoint);
            this.ws.addEventListener('open', this.handleOpen);
            this.ws.addEventListener('message', this.handleMessage);
            this.ws.addEventListener('close', this.handleClose);
            this.ws.addEventListener('error', this.handleError);
        } catch {
            this.ws = null;
            this.setStatus('error');
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        if (this.destroyed || this.offlineMode || this.reconnectTimer !== null) {
            return;
        }

        const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 30_000);
        this.reconnectAttempt = Math.min(this.reconnectAttempt + 1, 5);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.destroyed) {
                return;
            }

            this.setStatus('connecting');
            this.connect();
        }, delay);
    }

    private sendUpdate(update: Uint8Array): void {
        if (
            !this.ws ||
            this.ws.readyState !== WebSocket.OPEN ||
            this.destroyed ||
            this.offlineMode
        ) {
            return;
        }

        const id = ++this.nextUpdateId;
        this.pendingUpdateIds.add(id);
        this.setSyncStatus('syncing');
        this.ws.send(
            JSON.stringify({
                type: 'update',
                id,
                update: Array.from(update),
            }),
        );
    }

    private readonly handleAwarenessUpdate = (
        changes: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
    ): void => {
        if (origin === this) {
            return;
        }

        this.sendAwarenessUpdate([...changes.added, ...changes.updated, ...changes.removed]);
    };

    private sendAwarenessUpdate(clientIds: number[]): void {
        if (
            clientIds.length === 0 ||
            !this.ws ||
            this.ws.readyState !== WebSocket.OPEN ||
            this.destroyed ||
            this.offlineMode
        ) {
            return;
        }

        const update = encodeAwarenessUpdate(this.awareness, clientIds);
        this.ws.send(
            JSON.stringify({
                type: 'awareness',
                update: Array.from(update),
            }),
        );
    }

    private cleanupAwareness(sendLocalRemoval: boolean): void {
        if (this.awarenessDestroyed) {
            return;
        }

        if (sendLocalRemoval && this.awareness.getLocalState() !== null) {
            this.awareness.setLocalState(null);
        }
        this.awareness.off('update', this.handleAwarenessUpdate);
        this.awareness.destroy();
        this.awarenessDestroyed = true;
    }

    private setStatus(status: ProviderStatus): void {
        if (this.status === status) {
            return;
        }

        this.status = status;
        this.onStatusChange?.(status);
    }

    private setSyncStatus(status: ProviderSyncStatus): void {
        if (this.syncStatus === status) {
            return;
        }

        this.syncStatus = status;
        this.onSyncStatusChange?.(status);
    }
}