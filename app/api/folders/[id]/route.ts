import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { parseFolderPayload } from "@/lib/folder-schema";
import {
  deleteFolder,
  FolderLimitError,
  FolderOwnershipError,
  FolderValidationError,
  saveFolder,
} from "@/lib/server/folders";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload JSON inválido" }, { status: 400 });
  }

  try {
    const folder = parseFolderPayload(body);
    if (folder.id !== id) {
      return NextResponse.json({ error: "el id del payload no coincide" }, { status: 400 });
    }
    const saved = await saveFolder(session.user.id, folder);
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "payload inválido" }, { status: 400 });
    }
    if (err instanceof FolderValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof FolderOwnershipError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof FolderLimitError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[folder] error al guardar carpeta:", err);
    return NextResponse.json({ error: "error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteFolder(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof FolderOwnershipError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[folder] error al eliminar carpeta:", err);
    return NextResponse.json({ error: "error interno" }, { status: 500 });
  }
}
