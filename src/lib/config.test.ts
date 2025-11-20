import { afterEach, describe, expect, it, vi } from "vitest";
import { configForBundleId, loadConfig, type Config } from "./config";

const sampleConfig: Config = {
  global: { ring: [{ label: "Global Action" }] },
  apps: {
    "com.app.specific": { ring: [{ label: "App Only" }] },
  },
};

describe("configForBundleId", () => {
  it("returns the global config when bundle id is omitted", async () => {
    await expect(configForBundleId(sampleConfig)).resolves.toBe(sampleConfig.global);
  });

  it("returns an app-specific config when available", async () => {
    await expect(configForBundleId(sampleConfig, "com.app.specific")).resolves.toBe(
      sampleConfig.apps!["com.app.specific"],
    );
  });

  it("falls back to the global config for unknown bundles", async () => {
    await expect(configForBundleId(sampleConfig, "unknown.bundle")).resolves.toBe(sampleConfig.global);
  });
});

describe("loadConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches config.json and returns the parsed content", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => sampleConfig,
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadConfig()).resolves.toEqual(sampleConfig);
    expect(fetchMock).toHaveBeenCalledWith("/config.json");
  });

  it("throws when config.json cannot be loaded", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadConfig()).rejects.toThrowError("Failed to load config.json");
  });
});
