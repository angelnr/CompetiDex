import { describe, expect, it } from "vitest";

import { MAX_JSON_BODY_BYTES, PayloadTooLargeError, readJsonBody } from "@/lib/request";

function post(body: BodyInit): Request {
  return new Request("http://localhost/api/test", { method: "POST", body });
}

describe("readJsonBody", () => {
  it("parsea un JSON válido", async () => {
    await expect(readJsonBody(post(JSON.stringify({ a: 1 })))).resolves.toEqual({ a: 1 });
  });

  it("rechaza JSON inválido", async () => {
    await expect(readJsonBody(post("{no es json"))).rejects.toBeInstanceOf(SyntaxError);
  });

  it("rechaza por Content-Length mayor que el límite sin leer el body", async () => {
    const fake = {
      headers: new Headers({ "content-length": String(MAX_JSON_BODY_BYTES + 1) }),
      body: null,
    } as unknown as Request;

    await expect(readJsonBody(fake)).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it("corta un body chunked que supera el límite", async () => {
    const chunk = new Uint8Array(1024).fill(120);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.close();
      },
    });
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);

    await expect(readJsonBody(request, 1024)).rejects.toBeInstanceOf(PayloadTooLargeError);
  });
});
