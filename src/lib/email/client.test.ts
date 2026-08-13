import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmailClient } from "@/lib/email/client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("email client", () => {
  it("uses the development logger without a Resend API key or network call", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    const fetchImpl = vi.fn<typeof fetch>();
    const info = vi.fn();
    const client = createEmailClient({
      fetchImpl,
      logger: { info },
      createId: () => "local-message",
    });

    const result = await client.send({
      to: "client@example.test",
      subject: "Test email",
      html: "<p>Test</p>",
      text: "Test",
    });

    expect(result).toEqual({ messageId: "dev-local-message" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith("Email recorded by the development logger.", {
      messageId: "dev-local-message",
      to: "client@example.test",
      subject: "Test email",
    });
  });

  it("posts a configured message to the Resend REST endpoint", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
    vi.stubEnv("EMAIL_FROM", "Poin't & Polish <bookings@example.test>");
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "resend-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createEmailClient({ fetchImpl });

    const result = await client.send({
      to: "client@example.test",
      subject: "Configured email",
      html: "<p>Configured</p>",
      text: "Configured",
    });

    expect(result).toEqual({ messageId: "resend-message-1" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer test-resend-key" });
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "Poin't & Polish <bookings@example.test>",
      to: "client@example.test",
      subject: "Configured email",
      html: "<p>Configured</p>",
      text: "Configured",
    });
  });
});
