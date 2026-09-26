import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import type { JSONContent } from '@tiptap/core';
import { Placeholder } from '@tiptap/extensions/placeholder';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import type { Editor as TiptapEditorInstance } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import * as Y from 'yjs';
import { getAuthSession } from './auth/authStorage';
import {
    CustomYjsWebSocketProvider,
    type ProviderStatus,
    type ProviderSyncStatus,
} from './providers/CustomYjsWebSocketProvider';
import './TiptapEditor.css';

const DOCUMENT_ID = 'doc_7a9c3e';
const CURSOR_COLORS = [
    '#176B5B',
    '#A34222',
    '#2456A6',
    '#8C3A63',
    '#6650A4',
    '#3E6B32',
    '#9B3D2D',
    '#176B78',
];

function getCursorColor(userId: string): string {
    let hash = 0;
    for (const character of userId) {
        hash = (hash * 31 + character.charCodeAt(0)) | 0;
    }

    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

const STATUS_LABELS: Record<ProviderStatus, string> = {
    connecting: 'Connecting',
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Connection error',
};

export type TiptapEditorProps = {
    className?: string;
    docId?: string;
    offlineMode?: boolean;
    onConnectionStatusChange?: (status: ProviderStatus) => void;
    onDocumentTextChange?: (text: string) => void;
    restoreRequest?: { id: number; content: JSONContent } | null;
    onRestoreApplied?: (id: number) => void;
    onOfflineEditCountChange?: (count: number) => void;
    onSyncStatusChange?: (status: ProviderSyncStatus) => void;
    renderToolbar?: (editor: TiptapEditorInstance | null) => ReactNode;
};

type ToolbarButtonProps = {
    label: string;
    active?: boolean;
    disabled?: boolean;
    children: ReactNode;
    onClick: () => void;
};

function ToolbarButton({
    label,
    active = false,
    disabled = false,
    children,
    onClick,
}: ToolbarButtonProps) {
    return (
        <button
            className={`toolbar-button${active ? ' is-active' : ''}`}
            type="button"
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
            title={label}
        >
            {children}
        </button>
    );
}

export default function TiptapEditor({
    className,
    docId = DOCUMENT_ID,
    offlineMode = false,
    onConnectionStatusChange,
    onDocumentTextChange,
    restoreRequest,
    onRestoreApplied,
    onOfflineEditCountChange,
    onSyncStatusChange,
    renderToolbar,
}: TiptapEditorProps) {
    const [ydoc] = useState(() => new Y.Doc());
    const [provider, setProvider] = useState<CustomYjsWebSocketProvider | null>(null);
    const [authenticatedUser] = useState(() => getAuthSession()?.user ?? null);
    const [connectionStatus, setConnectionStatus] = useState<ProviderStatus>('connecting');

    useEffect(() => {
        const activeProvider = new CustomYjsWebSocketProvider(
            ydoc,
            docId,
            (status) => {
                setConnectionStatus(status);
                onConnectionStatusChange?.(status);
            },
            onOfflineEditCountChange,
            onSyncStatusChange,
        );
        setProvider(activeProvider);
        return () => {
            activeProvider.onStatusChange = undefined;
            activeProvider.onOfflineEditCountChange = undefined;
            activeProvider.onSyncStatusChange = undefined;
            activeProvider.destroy();
        };
    }, [docId, onConnectionStatusChange, onOfflineEditCountChange, onSyncStatusChange, ydoc]);

    useLayoutEffect(() => {
        provider?.setOfflineMode(offlineMode);
    }, [offlineMode, provider]);

    const collaborationCaret = provider && authenticatedUser
        ? CollaborationCaret.configure({
            provider,
            user: {
                name: authenticatedUser.name,
                color: getCursorColor(authenticatedUser.id || authenticatedUser.email),
            },
        })
        : null;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ undoRedo: false }),
            Collaboration.configure({ document: ydoc }),
            Placeholder.configure({ placeholder: 'Start writing here...' }),
            ...(collaborationCaret ? [collaborationCaret] : []),
        ],
        editable: true,
    }, [provider]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const reportDocumentText = (): void => {
            onDocumentTextChange?.(editor.getText());
        };

        reportDocumentText();
        ydoc.on('update', reportDocumentText);
        return () => ydoc.off('update', reportDocumentText);
    }, [editor, onDocumentTextChange, ydoc]);

    useEffect(() => {
        if (!editor || !restoreRequest) {
            return;
        }

        editor.commands.setContent(restoreRequest.content, { emitUpdate: true });
        onDocumentTextChange?.(editor.getText());
        onRestoreApplied?.(restoreRequest.id);
    }, [editor, onDocumentTextChange, onRestoreApplied, restoreRequest]);

    const toolbarState = useEditorState({
        editor,
        selector: ({ editor: currentEditor }) => ({
            paragraph: currentEditor?.isActive('paragraph') ?? false,
            heading1: currentEditor?.isActive('heading', { level: 1 }) ?? false,
            heading2: currentEditor?.isActive('heading', { level: 2 }) ?? false,
            heading3: currentEditor?.isActive('heading', { level: 3 }) ?? false,
            bold: currentEditor?.isActive('bold') ?? false,
            italic: currentEditor?.isActive('italic') ?? false,
            underline: currentEditor?.isActive('underline') ?? false,
            bulletList: currentEditor?.isActive('bulletList') ?? false,
            orderedList: currentEditor?.isActive('orderedList') ?? false,
            canUndo: currentEditor?.can().undo() ?? false,
            canRedo: currentEditor?.can().redo() ?? false,
        }),
    });

    return (
        <section
            className={className ? `tiptap-editor ${className}` : 'tiptap-editor'}
            aria-label="Rich text editor"
        >
            {renderToolbar ? (
                <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
                    {renderToolbar(editor)}
                </div>
            ) : (
                <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
                    <div className="toolbar-group" aria-label="Block style">
                        <ToolbarButton
                            label="Paragraph"
                            active={toolbarState.paragraph}
                            disabled={!editor}
                            onClick={() => editor?.chain().focus().setParagraph().run()}
                        >
                            P
                        </ToolbarButton>
                        <ToolbarButton
                            label="Heading 1"
                            active={toolbarState.heading1}
                            disabled={!editor}
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                        >
                            H1
                        </ToolbarButton>
                        <ToolbarButton
                            label="Heading 2"
                            active={toolbarState.heading2}
                            disabled={!editor}
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                        >
                            H2
                        </ToolbarButton>
                        <ToolbarButton
                            label="Heading 3"
                            active={toolbarState.heading3}
                            disabled={!editor}
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                        >
                            H3
                        </ToolbarButton>
                    </div>

                    <div className="toolbar-group" aria-label="Text formatting">
                        <ToolbarButton
                            label="Bold"
                            active={toolbarState.bold}
                            disabled={!editor}
                            onClick={() => editor?.chain().focus().toggleBold().run()}
                        >
                            <strong>B</strong>
                        </ToolbarButton>
                        <ToolbarButton
                            label="Italic"
                            active={toolbarState.italic}
                            disabled={!editor}
                            onClick={() => editor?.chain().focus().toggleItalic().run()}
                        >
                            <em>I</em>
                        </ToolbarButton>
                        <ToolbarButton
                            label="Underline"
                            active={toolbarState.underline}
                            disabled={!editor}
                            onClick={() => editor?.chain().focus().toggleUnderline().run()}
                        >
                            <span className="underline-icon">U</span>
                        </ToolbarButton>
                    </div>

                    <div className="toolbar-group" aria-label="Lists">
                        <ToolbarButton
                            label="Bullet list"
                            active={toolbarState.bulletList}
                            disabled={!editor}
                            onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        >
                            &#8226;&#8226;&#8226;
                        </ToolbarButton>
                        <ToolbarButton
                            label="Ordered list"
                            active={toolbarState.orderedList}
                            disabled={!editor}
                            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        >
                            1.
                        </ToolbarButton>
                    </div>

                    <div className="toolbar-group" aria-label="History">
                        <ToolbarButton
                            label="Undo"
                            disabled={!editor || !toolbarState.canUndo}
                            onClick={() => editor?.chain().focus().undo().run()}
                        >
                            &#8630;
                        </ToolbarButton>
                        <ToolbarButton
                            label="Redo"
                            disabled={!editor || !toolbarState.canRedo}
                            onClick={() => editor?.chain().focus().redo().run()}
                        >
                            &#8631;
                        </ToolbarButton>
                    </div>
                    <span
                        className={`connection-status is-${connectionStatus}`}
                        role="status"
                        aria-live="polite"
                    >
                        {STATUS_LABELS[connectionStatus]}
                    </span>
                </div>
            )}
            <EditorContent className="editor-content" editor={editor} />
        </section>
    );
}