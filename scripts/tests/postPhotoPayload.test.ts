import { mergePhotoMediaUrls, parseLegacyPhotoBody } from "../../lib/data/postPhotoPayload";
import { describe, expect, it } from "vitest";

describe("postPhotoPayload helpers", () => {
  it("parses legacy object payloads", () => {
    const parsedObject = parseLegacyPhotoBody(JSON.stringify({
      mediaPaths: ["user/post-1.jpg"],
      mediaUrls: ["https://cdn.example.com/post-1.jpg"],
      caption: "Leg day",
    }));

    expect(parsedObject).not.toBeNull();
    expect(parsedObject?.caption).toBe("Leg day");
    expect(parsedObject?.mediaPaths[0]).toBe("user/post-1.jpg");
    expect(parsedObject?.mediaUrls[0]).toBe("https://cdn.example.com/post-1.jpg");
  });

  it("parses legacy array payloads", () => {
    const parsedArray = parseLegacyPhotoBody(JSON.stringify([
      "https://cdn.example.com/post-2.jpg",
      "https://cdn.example.com/post-3.jpg",
    ]));

    expect(parsedArray).not.toBeNull();
    expect(parsedArray?.mediaUrls.length ?? 0).toBe(2);
  });

  it("merges resolved URLs without duplicates", () => {
    const merged = mergePhotoMediaUrls({
      mediaUrls: ["https://cdn.example.com/post-2.jpg"],
      resolvedUrls: ["https://cdn.example.com/post-2.jpg", "https://cdn.example.com/post-4.jpg"],
    });

    expect(merged.length).toBe(2);
    expect(merged[1]).toBe("https://cdn.example.com/post-4.jpg");
  });

  it("returns null for invalid payload JSON", () => {
    const invalid = parseLegacyPhotoBody("not json");
    expect(invalid).toBeNull();
  });
});
