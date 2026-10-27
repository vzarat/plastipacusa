import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isEmailRateLimitError } from "./email-rate-limit.ts";

describe("email rate limit", () => {
  it("matches the Supabase message and a 429 status", () => {
    assert.equal(isEmailRateLimitError({ message: "Email rate limit exceeded" }), true);
    assert.equal(isEmailRateLimitError({ message: "Request failed: email rate limit exceeded" }), true);
    assert.equal(isEmailRateLimitError({ message: "other", status: 429 }), true);
    assert.equal(isEmailRateLimitError({ message: "Invalid login credentials", status: 400 }), false);
  });
});
