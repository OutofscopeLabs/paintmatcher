import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { catalogListing } from "@/lib/catalog";
import { matchAll, type Detection } from "@/lib/match";
import { RecognitionSchema } from "@/lib/recognize-schema";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = process.env.PAINTMATCHER_MODEL ?? "claude-opus-5";
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

interface ImageInput { data: string; mediaType: MediaType }

// The catalog listing is stable across requests, so it sits at the top of the system prompt
// behind a cache breakpoint. Only the images vary per request.
const SYSTEM_STABLE = `You identify miniature-painting acrylic paints from photographs of paint pots and bottles.

The user photographs their paint collection (Citadel pots, Army Painter dropper bottles, Vallejo dropper bottles, possibly others). For every distinct paint you can see, read the label and report the brand, product range, paint name and product code.

Rules:
- Read what is printed. Do not guess a name from the cap colour alone; if the label is unreadable, still report the pot with brand (if identifiable from the bottle shape/branding), an empty name, a low confidence and the hexGuess of the visible colour.
- Prefer the exact spelling from the catalog below. If the label matches a catalog entry, use the catalog name and code verbatim.
- Vallejo bottles print a code like 70.950 or 72.001 — always report it when legible; it is the most reliable identifier. Army Painter Fanatic bottles print codes like WP3001.
- Citadel pots have no code. Their range (Base / Layer / Shade / Contrast / Technical / Dry / Air) is printed on the pot lid or label.
- Report each distinct paint once, with count = number of identical pots.
- Confidence: 0.9+ only when brand and full name are clearly legible; 0.5–0.8 when partially legible; below 0.5 when inferred.
- Brands other than Citadel, The Army Painter and Vallejo: brand "other", with the manufacturer's name at the start of labelText.
- Add a caveat for anything cut off, blurred, or seen only from the side.

Reference catalog (brand, range, optional code, name):
${catalogListing()}`;

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return badRequest("Server has no Anthropic credentials. Copy .env.example to .env.local and set ANTHROPIC_API_KEY.", 500);
  }

  let body: { images?: ImageInput[] };
  try {
    body = (await req.json()) as { images?: ImageInput[] };
  } catch {
    return badRequest("Request body must be JSON with an images[] array.");
  }
  const images = (body.images ?? []).filter((i) => i && typeof i.data === "string");
  if (images.length === 0) return badRequest("No images supplied.");
  if (images.length > MAX_IMAGES) return badRequest(`At most ${MAX_IMAGES} images per request.`);
  for (const img of images) {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(img.mediaType)) return badRequest(`Unsupported image type ${img.mediaType}.`);
    if (img.data.length * 0.75 > MAX_IMAGE_BYTES) return badRequest("An image is too large; resize to under 6 MB.");
  }

  const client = new Anthropic();
  const content: Anthropic.ContentBlockParam[] = [
    ...images.map<Anthropic.ImageBlockParam>((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    })),
    {
      type: "text",
      text: `Identify every paint pot or bottle visible in ${images.length === 1 ? "this photo" : "these photos"}. If the same pot appears in more than one photo, report it once.`,
    },
  ];

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM_STABLE, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(RecognitionSchema) },
    });

    if (response.stop_reason === "refusal") {
      return badRequest("The model declined to process these images.", 422);
    }
    const parsed = response.parsed_output;
    if (!parsed) return badRequest("The model returned an unparseable result; please try again.", 502);

    const detections: Detection[] = parsed.detections.map((d) => ({
      brand: d.brand,
      range: d.range || undefined,
      name: d.name,
      code: d.code || undefined,
      confidence: d.confidence,
      count: Math.max(1, d.count),
      labelText: d.labelText || undefined,
      hexGuess: /^#[0-9a-f]{6}$/i.test(d.hexGuess) ? d.hexGuess.toUpperCase() : undefined,
    }));

    const matches = matchAll(detections).map((m) => ({
      detection: m.detection,
      best: m.best ? { paintId: m.best.paint.id, score: m.best.score, reason: m.best.reason } : null,
      candidates: m.candidates.map((c) => ({ paintId: c.paint.id, score: c.score, reason: c.reason })),
    }));

    return NextResponse.json({
      matches,
      caveats: parsed.caveats,
      usage: {
        model: response.model,
        inputTokens: response.usage.input_tokens,
        cachedTokens: response.usage.cache_read_input_tokens ?? 0,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return badRequest("Anthropic rejected the API key.", 401);
    if (err instanceof Anthropic.RateLimitError) return badRequest("Rate limited by Anthropic; wait a moment and retry.", 429);
    if (err instanceof Anthropic.BadRequestError) return badRequest(`Anthropic rejected the request: ${err.message}`, 400);
    if (err instanceof Anthropic.APIError) return badRequest(`Anthropic API error ${err.status}: ${err.message}`, 502);
    console.error(err);
    return badRequest("Unexpected server error.", 500);
  }
}
