const MAX_MEDIA_ITEMS = 4;

export type ParsedPhotoPayload = {
  caption: string | null;
  mediaPaths: string[];
  mediaUrls: string[];
};

export function isLikelyUri(value: string) {
  return /^(https?:\/\/|file:\/\/|content:\/\/|data:image\/)/i.test(value.trim());
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeUnique(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    next.push(value);
  }
  return next.slice(0, MAX_MEDIA_ITEMS);
}

export function parseLegacyPhotoBody(body: string | null): ParsedPhotoPayload | null {
  const rawBody = body?.trim() ?? "";
  if (!rawBody) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    parsed = null;
  }

  const mediaPathCandidates: string[] = [];
  const mediaUrlCandidates: string[] = [];
  let caption: string | null = null;

  const pushMediaCandidate = (value: unknown) => {
    if (typeof value !== "string") return;
    const normalized = value.trim();
    if (!normalized) return;
    if (isLikelyUri(normalized)) {
      mediaUrlCandidates.push(normalized);
      return;
    }
    mediaPathCandidates.push(normalized);
  };

  if (Array.isArray(parsed)) {
    parsed.forEach(pushMediaCandidate);
  } else if (parsed && typeof parsed === "object") {
    const objectValue = parsed as Record<string, unknown>;
    const mediaCandidates = [
      objectValue.media,
      objectValue.mediaUrls,
      objectValue.photo,
      objectValue.photos,
      objectValue.image,
      objectValue.images,
      objectValue.uri,
      objectValue.url,
      objectValue.mediaPaths,
    ];

    mediaCandidates.forEach((candidate) => {
      if (Array.isArray(candidate)) {
        candidate.forEach(pushMediaCandidate);
        return;
      }
      pushMediaCandidate(candidate);
    });

    const captionValue = objectValue.caption ?? objectValue.body ?? objectValue.text;
    if (typeof captionValue === "string" && captionValue.trim().length > 0) {
      caption = captionValue.trim();
    }
  } else if (isLikelyUri(rawBody)) {
    mediaUrlCandidates.push(rawBody);
  }

  const mediaPaths = normalizeUnique([...toStringArray(parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>).mediaPaths
    : undefined), ...mediaPathCandidates]);
  const mediaUrls = normalizeUnique(mediaUrlCandidates);

  if (mediaPaths.length === 0 && mediaUrls.length === 0 && !caption) {
    return null;
  }

  return { caption, mediaPaths, mediaUrls };
}

export function mergePhotoMediaUrls(input: {
  mediaUrls?: string[];
  resolvedUrls?: string[];
}): string[] {
  return normalizeUnique([...(input.mediaUrls ?? []), ...(input.resolvedUrls ?? [])]);
}
