import { db } from "../db/client";

export type DocumentPermission = "owner" | "editor" | "viewer";

export async function getDocumentPermission(
    docId: string,
    userId: string,
): Promise<DocumentPermission | null> {
    const result = await db.query<{
        owner_id: string | null;
        permission: "editor" | "viewer" | null;
    }>(
        "SELECT documents.owner_id, document_permissions.permission FROM documents LEFT JOIN document_permissions ON document_permissions.doc_id = documents.id AND document_permissions.user_id = $2 WHERE documents.id = $1",
        [docId, userId],
    );
    const document = result.rows[0];
    if (!document) return null;
    if (document.owner_id === userId) return "owner";
    return document.permission;
}

export function canReadDocument(permission: DocumentPermission | null): boolean {
    return permission !== null;
}

export function canEditDocument(permission: DocumentPermission | null): boolean {
    return permission === "owner" || permission === "editor";
}
