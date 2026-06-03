import { afterEach, describe, expect, it } from "vitest";
import handler from "./macro.js";

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body) {
      this.body = body;
    },
    get json() {
      return JSON.parse(this.body);
    },
  };
}

afterEach(() => {
  delete process.env.FRED_API_KEY;
});

describe("macro handler — graceful degradation", () => {
  it("returns 200 with an empty payload when FRED_API_KEY is absent (no false 502)", async () => {
    delete process.env.FRED_API_KEY;
    const response = mockResponse();
    await handler({ query: {} }, response);

    // No key in production must not surface a console 502: the endpoint is
    // healthy, the data is simply unavailable (UI shows an honest empty state).
    expect(response.statusCode).toBe(200);
    expect(response.json.indicators).toEqual([]);
    expect(response.json.unavailable).toBe(true);
  });
});
