/**
 * Borra las sesiones caducadas de la BBDD.
 *
 * Better Auth no elimina automáticamente las sesiones expiradas y con
 * `storeSessionInDatabase: true` cada login deja una fila permanente.
 * Este script se ejecuta desde el servicio `db-maintenance` (docker-compose).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const sessions = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(`[maintenance] sesiones caducadas borradas: ${sessions.count}`);
} finally {
  await prisma.$disconnect();
}
