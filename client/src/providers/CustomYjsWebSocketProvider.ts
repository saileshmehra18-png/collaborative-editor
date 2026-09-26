import * as Y from 'yjs';
import {
    applyAwarenessUpdate,
    Awareness,
    encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import { getAuthSession } from '../auth/authStorage';

export type ProviderStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type ProviderMessage = {
    type: 'sync' | 'update' | 'awareness';
    update: number[];
};

function isProviderMessage(value: unknown): value is ProviderMessage {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const message = value as Record<string, unknown>;
    return (
        (message.type === 'sync' || message.type === 'update' || message.type === 'awareness') &&
        Array.isArray(message.update) &&
        message.update.every(
            (byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255,
        )
    );
}

export class CustomYjsWebSocketProvider {
    readonly ws: WebSocket | null;
    readonly awareness: Awareness;
    status: ProviderStatus = 'connecting';
    onStatusChange?: (status: ProviderStatus) => void;

    private destroyed = false;
    private awarenessDestroyed = false;

    constructor(
        private readonly doc: Y.Doc,
        docId: string,
        onStatusChange?: (status: ProviderStatus) => void,
    ) {
        this.onStatusChange = onStatusChange;
        this.awareness = new Awareness(this.doc);
        this.awareness.on('update', this.handleAwarenessUpdate);

        const token = getAuthSession()?.token;
        if (!token) {
            this.ws = null;
            this.setStatus('error');
            return;
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const endpoint = new URL(`${wsProtocol}//${window.location.host}/ws`);
        endpoint.searchParams.set('docId', docId);
        endpoint.searchParams.set('token', token);
        this.ws = new WebSocket(endpoint);

        this.doc.on('update', this.handleDocumentUpdate);
        this.ws.addEventListener('open', this.handleOpen);
        this.ws.addEventListener('message', this.handleMessage);
        this.ws.addEventListener('close', this.handleClose);
        this.ws.addEventListener('error', this.handleError);
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }

        this.doc.off('update', this.handleDocumentUpdate);
        this.cleanupAwareness(true);
        this.destroyed = true;
        this.ws?.removeEventListener('open', this.handleOpen);
        this.ws?.removeEventListener('message', this.handleMessage);
        this.ws?.removeEventListener('close', this.handleClose);
        this.ws?.removeEventListener('error', this.handleError);

        if (
            this.ws &&
            (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)
        ) {
            this.ws.close();
        }

        this.setStatus('disconnected');
    }

    private readonly handleDocumentUpdate = (update: Uint8Array, origin: unknown): void => {
        if (origin !== this) {
            this.sendUpdate(update);
        }
    };

    private readonly handleOpen = (): void => {
        this.setStatus('connected');
        this.sendUpdate(Y.encodeStateAsUpdate(this.doc));
        if (this.awareness.getLocalState() !== null) {
            this.sendAwarenessUpdate([this.awareness.clientID]);
        }
    };

    private readonly handleMessage = (event: MessageEvent): void => {
        if (typeof event.data !== 'string') {
            return;
        }

        try {
            const message: unknown = JSON.parse(event.data);
            if (!isProviderMessage(message)) {
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

    private readonly handleClose = (): void => {
        this.doc.off('update', this.handleDocumentUpdate);
        this.cleanupAwareness(false);
        this.setStatus('disconnected');
    };

    private readonly handleError = (): void => {
        this.setStatus('error');
    };

    private sendUpdate(update: Uint8Array): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.destroyed) {
            return;
        }

        this.ws.send(
            JSON.stringify({
                type: 'update',
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
            this.destroyed
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
}