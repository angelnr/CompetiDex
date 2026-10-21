import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  deleteTeam,
  getTeam,
  saveTeam,
  TeamLimitError,
  TeamOwnershipError,
} from "@/lib/server/teams";
import { parseTeamPayload, TeamValidationError } from "@/lib/team-schema";
import { PayloadTooLargeError, readJsonBody } from "@/lib/request";
import { ZodError } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const team = await getTeam(session.user.id, id);
  if (!team) {
    return NextResponse.json(null);
  }
  return NextResponse.json(team);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: "payload demasiado grande" }, { status: 413 });
    }
    return NextResponse.json({ error: "payload JSON inválido" }, { status: 400 });
  }

  try {
    const team = parseTeamPayload(body);
    if (team.id !== id) {
      return NextResponse.json({ error: "el id del payload no coincide" }, { status: 400 });
    }
    const saved = await saveTeam(session.user.id, team);
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "payload inválido" }, { status: 400 });
    }
    if (err instanceof TeamValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof TeamOwnershipError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof TeamLimitError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "payload JSON inválido" }, { status: 400 });
    }
    console.error("[team] error al guardar equipo:", err);
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
    await deleteTeam(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TeamOwnershipError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[team] error al eliminar equipo:", err);
    return NextResponse.json({ error: "error interno" }, { status: 500 });
  }
}
