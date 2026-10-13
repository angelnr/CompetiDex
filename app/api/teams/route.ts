import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listTeams } from "@/lib/server/teams";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const teams = await listTeams(session.user.id);
  return NextResponse.json(teams);
}
