import { describe, expect, it } from "vitest";
import { createStorageService } from "../src/services/storage";

function createMemoryStorage() {
  const values: Record<string, unknown> = {};
  return {
    get: async (keys: string | string[]) => {
      const names = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(names.map((key) => [key, values[key]]));
    },
    set: async (next: Record<string, unknown>) => { Object.assign(values, next); }
  };
}

describe("storage service", () => {
  it("persists only valid ignore rules", async () => {
    const storage = createStorageService(createMemoryStorage());

    await storage.saveIgnoreRule({ id: "a", type: "domain", value: "example.test", createdAt: 1 });
    await expect(storage.saveIgnoreRule({ id: "b", type: "bad" as "url", value: "x", createdAt: 1 })).rejects.toThrow(
      "Invalid ignore rule type"
    );

    await expect(storage.getIgnoreRules()).resolves.toEqual([
      { id: "a", type: "domain", value: "example.test", createdAt: 1 }
    ]);
  });
});
