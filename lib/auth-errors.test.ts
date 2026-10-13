import { describe, expect, it } from "vitest";

import { readAuthErrorKey } from "@/lib/auth-errors";

describe("readAuthErrorKey", () => {
  it("mapea email duplicado", () => {
    expect(
      readAuthErrorKey({
        message: "User already exists. Use another email.",
        code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
        status: 422,
      }),
    ).toBe("errorEmailExists");
  });

  it("mapea contraseña demasiado corta", () => {
    expect(readAuthErrorKey({ message: "Password too short", code: "PASSWORD_TOO_SHORT" })).toBe(
      "errorPasswordTooShort",
    );
  });

  it("mapea credenciales inválidas", () => {
    expect(readAuthErrorKey({ message: "Invalid email or password", status: 401 })).toBe(
      "errorInvalidCredentials",
    );
  });

  it("mapea rate limit por status 429", () => {
    expect(readAuthErrorKey({ status: 429 })).toBe("errorRateLimited");
    expect(readAuthErrorKey({ message: "Too many requests" })).toBe("errorRateLimited");
  });

  it("cae al genérico para errores desconocidos", () => {
    expect(readAuthErrorKey(new Error("boom"))).toBe("errorGeneric");
    expect(readAuthErrorKey(null)).toBe("errorGeneric");
    expect(readAuthErrorKey(undefined)).toBe("errorGeneric");
  });
});
