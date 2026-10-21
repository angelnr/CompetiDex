import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { SecondaryStorage } from "better-auth";

import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

/**
 * Storage secundario de Better Auth (sesiones + rate-limit) respaldado por
 * Redis. Si Redis no está disponible (dev sin `REDIS_URL`), degrada a un
 * Map en memoria para no romper la autenticación.
 */
function createSecondaryStorage(): SecondaryStorage {
  const memoryStore = new Map<string, { value: string; ttl?: number }>();
  const redis = getRedis();

  return {
    async get(key) {
      if (redis) {
        try {
          return await redis.get(key);
        } catch {
          return null;
        }
      }
      return memoryStore.get(key)?.value ?? null;
    },
    async getAndDelete(key) {
      if (redis) {
        try {
          return await redis.getdel(key);
        } catch {
          return null;
        }
      }
      const item = memoryStore.get(key);
      memoryStore.delete(key);
      return item ? item.value : null;
    },
    async increment(key, ttl) {
      if (redis) {
        try {
          const value = await redis.incr(key);
          if (value === 1) await redis.expire(key, ttl);
          return value;
        } catch {
          return 1;
        }
      }
      const item = memoryStore.get(key);
      if (!item) {
        memoryStore.set(key, { value: "1", ttl });
        return 1;
      }
      const next = Number(item.value) + 1;
      memoryStore.set(key, { value: String(next) });
      return next;
    },
    async set(key, value, ttl) {
      if (redis) {
        try {
          if (ttl) await redis.set(key, value, "EX", ttl);
          else await redis.set(key, value);
        } catch {
          // degrade silencioso: el fallback de sesión en BBDD cubre el caso
        }
        return;
      }
      if (ttl !== undefined) {
        memoryStore.set(key, { value, ttl });
      } else {
        memoryStore.set(key, { value });
      }
    },
    async delete(key) {
      if (redis) {
        try {
          await redis.del(key);
        } catch {
          // redis caído: no-op
        }
        return null;
      }
      memoryStore.delete(key);
      return null;
    },
  };
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    // Alineado con la validación del formulario (AuthForm): mínimo 6.
    // El default de Better Auth es 8 y provocaba errores genéricos.
    minPasswordLength: 6,
    // Sin correo verificado no se crea sesión (frena cuentas basura).
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Sin proveedor configurado (dev), dejar el enlace en el log para poder
      // completar el flujo manualmente. En producción RESEND_API_KEY existe.
      if (!process.env.RESEND_API_KEY) {
        console.info(`[auth] enlace de verificación (dev, sin RESEND_API_KEY): ${url}`);
      }
      const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "CompetiDex";
      await sendEmail({
        to: user.email,
        subject: `Verifica tu cuenta en ${appName}`,
        html: [
          `<p>Hola ${user.name},</p>`,
          `<p>Confirma tu correo para activar tu cuenta en ${appName}:</p>`,
          `<p><a href="${url}">Verificar cuenta</a></p>`,
          `<p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>`,
        ].join(""),
      });
    },
  },
  secondaryStorage: createSecondaryStorage(),
  session: {
    storeSessionInDatabase: true,
  },
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
  },
});
