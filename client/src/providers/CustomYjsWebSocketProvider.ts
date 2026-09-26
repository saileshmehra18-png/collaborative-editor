import * as Y from 'yjs';
import { getAuthSession } from '../auth/authStorage';

export type ProviderStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type YjsMessage = {
    type: 'sync' | 'update';
    update: number[];
};

function isYjsMessage(value: unknown): value is YjsMessage {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const message = value as Record<string, unknown>;
    return (
        (message.type === 'sync' || message.type === 'update') &&
        Array.isArray(message.update) &&
        message.update.every(
            (byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255,
        )
    );
}

export class CustomYjsWebSocketProvider {
    readonly ws: WebSocket | null;
    status: ProviderStatus = 'connecting';
    onStatusChange?: (status: ProviderStatus) => void;

    private destroyed = false;

    constructor(
        private readonly doc: Y.Doc,
        docId: string,
        onStatusChange?: (status: ProviderStatus) => void,
    ) {
        this.onStatusChange = onStatusChange;

        const token = getAuthSession()?.token;
        if (!token) {
            this.ws = null;
            this.setStatus('error');
            return;
        }

        const endpoint = new URL('ws://localhost:4000/');
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

        this.destroyed = true;
        this.doc.off('update', this.handleDocumentUpdate);
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
    };

    private readonly handleMessage = (event: MessageEvent): void => {
        if (typeof event.data !== 'string') {
            return;
        }

        try {
            const message: unknown = JSON.parse(event.data);
            if (!isYjsMessage(message)) {
                return;
            }

            Y.applyUpdate(this.doc, Uint8Array.from(message.update), this);
        } catch {
            this.setStatus('error');
        }
    };

    private readonly handleClose = (): void => {
        this.doc.off('update', this.handleDocumentUpdate);
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

    private setStatus(status: ProviderStatus): void {
        if (this.status === status) {
            return;
        }

        this.status = status;
        this.onStatusChange?.(status);
    }
}