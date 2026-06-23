import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("mercadopago", () => {
  class InvalidWebhookSignatureError extends Error {
    reason = "SignatureMismatch";
  }
  return {
    MercadoPagoConfig: vi.fn(),
    PreApproval: vi.fn(),
    Payment: vi.fn(),
    WebhookSignatureValidator: { validate: vi.fn() },
    InvalidWebhookSignatureError,
  };
});

import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";

const mockValidate = WebhookSignatureValidator.validate as unknown as ReturnType<typeof vi.fn>;

describe("verifyWebhookSignature", () => {
  const ORIGINAL_ENV = process.env.MP_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.MP_WEBHOOK_SECRET = ORIGINAL_ENV;
    vi.resetModules();
    mockValidate.mockReset();
  });

  it("returns false when MP_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.MP_WEBHOOK_SECRET;
    const { verifyWebhookSignature } = await import("../mercadopago");
    const result = verifyWebhookSignature({ xSignature: "ts=1,v1=abc", xRequestId: "r1", dataId: "123" });
    expect(result).toBe(false);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("returns true when the SDK validator accepts the signature", async () => {
    process.env.MP_WEBHOOK_SECRET = "test-secret";
    mockValidate.mockReturnValue(undefined);
    const { verifyWebhookSignature } = await import("../mercadopago");
    const result = verifyWebhookSignature({ xSignature: "ts=1,v1=abc", xRequestId: "r1", dataId: "123" });
    expect(result).toBe(true);
  });

  it("returns false when the SDK validator throws InvalidWebhookSignatureError", async () => {
    process.env.MP_WEBHOOK_SECRET = "test-secret";
    mockValidate.mockImplementation(() => { throw new InvalidWebhookSignatureError("SignatureMismatch" as never); });
    const { verifyWebhookSignature } = await import("../mercadopago");
    const result = verifyWebhookSignature({ xSignature: "ts=1,v1=bad", xRequestId: "r1", dataId: "123" });
    expect(result).toBe(false);
  });
});

describe("createSubscription / cancelSubscription without credentials", () => {
  beforeEach(() => {
    delete process.env.MP_ACCESS_TOKEN;
    vi.resetModules();
  });

  it("createSubscription throws a clear error when MP_ACCESS_TOKEN is missing", async () => {
    const { createSubscription } = await import("../mercadopago");
    await expect(createSubscription({ id: "adv1", email: "a@b.com", name: "Ana" })).rejects.toThrow(/MP_ACCESS_TOKEN/);
  });

  it("cancelSubscription throws a clear error when MP_ACCESS_TOKEN is missing", async () => {
    const { cancelSubscription } = await import("../mercadopago");
    await expect(cancelSubscription("pre1")).rejects.toThrow(/MP_ACCESS_TOKEN/);
  });
});
