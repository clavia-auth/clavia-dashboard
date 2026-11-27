import { describe, expect, it } from "vitest";

import { sign, verifies } from "../../e2e/standard-webhooks";

// The specification's own example (github.com/standard-webhooks/standard-webhooks, "Signature scheme").
const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const ID = "msg_p5jXN8AQM9LWM0D4loKWxJek";
const TIMESTAMP = "1614265330";
const BODY = '{"test": 2432232314}';
const SIGNATURE = "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=";
const NOW = 1_614_265_330_000;

const headers = { "webhook-id": ID, "webhook-timestamp": TIMESTAMP, "webhook-signature": SIGNATURE };

describe("sign", () => {
  it("gives the specification's signature", () => {
    expect(sign(SECRET, ID, TIMESTAMP, BODY)).toBe(SIGNATURE);
  });
});

describe("verifies", () => {
  it("accepts the specification's example", () => {
    expect(verifies(SECRET, headers, BODY, NOW)).toBe(true);
  });

  it("accepts the right signature among several, as during a rotation", () => {
    const rotating = {
      ...headers,
      "webhook-signature": `v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= ${SIGNATURE}`,
    };

    expect(verifies(SECRET, rotating, BODY, NOW)).toBe(true);
  });

  it("refuses another body, another secret, and a signature that is not there", () => {
    expect(verifies(SECRET, headers, '{"test": 1}', NOW)).toBe(false);
    expect(verifies("whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", headers, BODY, NOW)).toBe(false);
    expect(verifies(SECRET, { "webhook-id": ID, "webhook-timestamp": TIMESTAMP }, BODY, NOW)).toBe(false);
  });

  it("refuses a delivery too old or too far ahead, whatever its signature", () => {
    expect(verifies(SECRET, headers, BODY, NOW + 301_000)).toBe(false);
    expect(verifies(SECRET, headers, BODY, NOW - 301_000)).toBe(false);
    expect(verifies(SECRET, headers, BODY, NOW + 299_000)).toBe(true);
  });
});
