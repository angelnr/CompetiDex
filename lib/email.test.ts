import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "@/lib/email";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "CompetiDex <no-reply@example.com>";
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

describe("sendEmail", () => {
  it("no llama a Resend si falta configuración", async () => {
    delete process.env.RESEND_API_KEY;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendEmail({ to: "user@example.com", subject: "Hola", html: "<p>Hola</p>" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("envía el correo por la API REST de Resend", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await sendEmail({ to: "user@example.com", subject: "Verifica", html: "<p>Link</p>" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer re_test",
          "Content-Type": "application/json",
        },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as {
      from: string;
      to: string[];
      subject: string;
    };
    expect(body).toMatchObject({
      from: "CompetiDex <no-reply@example.com>",
      to: ["user@example.com"],
      subject: "Verifica",
    });
  });

  it("avisa si el remitente usa un dominio ts.net (imposible de verificar)", async () => {
    process.env.EMAIL_FROM = "CompetiDex <no-reply@servidor-angel.tailda287c.ts.net>";
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendEmail({ to: "user@example.com", subject: "Hola", html: "<p>Hola</p>" });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("ts.net"));
    errorSpy.mockRestore();
  });

  it("logea el error si Resend responde con fallo", async () => {
    fetchMock.mockResolvedValueOnce(new Response("invalid api key", { status: 401 }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendEmail({ to: "user@example.com", subject: "Hola", html: "<p>Hola</p>" });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("401"));
    errorSpy.mockRestore();
  });

  it("no propaga errores de red", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendEmail({ to: "user@example.com", subject: "Hola", html: "<p>Hola</p>" }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
