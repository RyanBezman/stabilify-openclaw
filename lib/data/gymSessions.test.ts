import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  existingSessionMaybeSingle: vi.fn(),
  routineMaybeSingle: vi.fn(),
  saveSingle: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
  recordActivityEvent: vi.fn(),
  queryCounters: {
    gymSessions: 0,
  },
}));

vi.mock("../supabase", () => {
  return {
    supabase: {
      auth: {
        getUser: mocks.authGetUser,
      },
      from: (table: string) => {
        if (table === "gym_sessions") {
          mocks.queryCounters.gymSessions += 1;

          if (mocks.queryCounters.gymSessions === 1) {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: mocks.existingSessionMaybeSingle,
                  }),
                }),
              }),
            };
          }

          return {
            upsert: () => ({
              select: () => ({
                single: mocks.saveSingle,
              }),
            }),
          };
        }

        if (table === "routines") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: mocks.routineMaybeSingle,
              }),
            }),
          };
        }

        throw new Error(`Unexpected table lookup in test: ${table}`);
      },
      storage: {
        from: (bucket: string) => {
          if (bucket !== "gym-proofs") {
            throw new Error(`Unexpected bucket lookup in test: ${bucket}`);
          }

          return {
            upload: mocks.upload,
            remove: mocks.remove,
          };
        },
      },
      rpc: mocks.rpc,
    },
  };
});

vi.mock("./activityEvents", () => ({
  recordActivityEvent: mocks.recordActivityEvent,
}));

import { saveGymSession } from "./gymSessions";

describe("saveGymSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryCounters.gymSessions = 0;

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.existingSessionMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    mocks.routineMaybeSingle.mockResolvedValue({
      data: { gym_lat: 40.7128, gym_lng: -74.006, gym_radius_m: 200 },
      error: null,
    });
    mocks.saveSingle.mockResolvedValue({
      data: null,
      error: { message: "db write failed" },
    });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.recordActivityEvent.mockResolvedValue({ data: { ok: true } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["proof"], { type: "image/jpeg" }),
      }),
    );
  });

  it("removes an uploaded proof file when the gym session save fails", async () => {
    const result = await saveGymSession({
      recordedAt: new Date("2026-03-10T15:30:00.000Z"),
      timezone: "America/New_York",
      status: "partial",
      photoUri: "file:///proof.jpg",
      location: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    });

    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledWith([
      expect.stringMatching(/^user-1\/gym-2026-03-10-/),
    ]);
    expect(result.error).toBe("db write failed");
  });

  it("maps missing gym proof bucket errors to a stable user-facing message", async () => {
    mocks.upload.mockResolvedValue({
      error: {
        message: "Bucket not found",
        details: "bucket not found",
      },
    });

    const result = await saveGymSession({
      recordedAt: new Date("2026-03-10T15:30:00.000Z"),
      timezone: "America/New_York",
      status: "partial",
      photoUri: "file:///proof.jpg",
      location: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    });

    expect(mocks.saveSingle).not.toHaveBeenCalled();
    expect(result.error).toBe("Couldn't upload your gym proof photo right now. Please try again.");
  });
});
