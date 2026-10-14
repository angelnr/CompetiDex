import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listFolders } from "@/lib/server/folders";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const folders = await listFolders(session.user.id);
  return NextResponse.json(folders);
}
