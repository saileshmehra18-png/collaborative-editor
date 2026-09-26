import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { ReactNode } from 'react';
import './TiptapEditor.css';

export type TiptapEditorProps = {
    className?: string;
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

export default function TiptapEditor({ className }: TiptapEditorProps) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: '<p>Start writing here...</p>',
    });

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
            </div>
            <EditorContent className="editor-content" editor={editor} />
        </section>
    );
}