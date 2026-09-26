import TiptapEditor from './TiptapEditor';

export default function App() {
    return (
        <div className="app-shell">
            <header className="topbar">
                <a className="brand" href="/" aria-label="Collaborative Editor home">
                    <span className="brand-mark" aria-hidden="true">
                        C
                    </span>
                    <span>Collaborative Editor</span>
                </a>
                <span className="client-tag">CLIENT</span>
            </header>

            <main className="workspace">
                <div className="document-heading">
                    <p className="eyebrow">DOCUMENT</p>
                    <h1>Untitled document</h1>
                </div>
                <div className="document-surface">
                    <TiptapEditor />
                </div>
            </main>
        </div>
    );
}