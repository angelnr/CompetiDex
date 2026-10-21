/**
 * Envío de correo transaccional vía Resend (REST, sin SDK).
 *
 * Variables de entorno necesarias en producción:
 * - `RESEND_API_KEY`: clave de API de Resend.
 * - `EMAIL_FROM`: remitente verificado, p. ej. `CompetiDex <no-reply@tudominio.com>`.
 *
 * Si faltan, se logea el error y el envío se omite: el alta no rompe y el
 * usuario puede pedir el reenvío desde la UI una vez configurado el correo.
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.error("[email] RESEND_API_KEY o EMAIL_FROM no configurados; correo no enviado");
    return;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] Resend respondió ${res.status}: ${detail.slice(0, 300)}`);
    }
  } catch (err) {
    console.error("[email] error de red al enviar:", err instanceof Error ? err.message : err);
  }
}
