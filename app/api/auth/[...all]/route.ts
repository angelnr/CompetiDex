import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

const handlers = toNextJsHandler(auth.handler);

/**
 * Throttle de registro por IP. Sin verificación de email, este límite es la
 * principal barrera contra cuentas basura; los topes de equipos/carpetas y la
 * limpieza de sesiones acotan el resto.
 */
const SIGNUP_LIMIT_PER_HOUR = 5;
const SIGNUP_WINDOW_S = 3_600;

export const GET = handlers.GET;

export async function POST(request: Request) {
  if (new URL(request.url).pathname.endsWith("/sign-up/email")) {
    const allowed = await checkRateLimit(
      `signup:${getClientIp(request.headers)}`,
      SIGNUP_LIMIT_PER_HOUR,
      SIGNUP_WINDOW_S,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "demasiados registros desde esta IP; inténtalo más tarde" },
        { status: 429, headers: { "Retry-After": String(SIGNUP_WINDOW_S) } },
      );
    }
  }

  return handlers.POST(request);
}
