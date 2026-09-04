/**
 * Browser-side paint recognition. The app is a static site, so the call goes straight from the
 * browser to the Anthropic API using the user's own key (stored only on their device).
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { catalogListing } from "./catalog";
import { matchAll, type Detection, type MatchResult } from "./match";
import { RecognitionSchema } from "./recognize-schema";

export type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export interface ImageInput { data: string; mediaType: MediaType }

export interface RecognitionResult {
  matches: MatchResult[];
  caveats: string[];
  usage: { model: string; inputTokens: number; cachedTokens: number; outputTokens: number };
}

export const MAX_IMAGES = 6;

// The catalog listing is identical on every request, so it sits behind a cache breakpoint;
// only the images vary, which keeps repeat scans cheap.
let systemPrompt: string | null = null;
function system(): string {
  systemPrompt ??= `You identify miniature-painting acrylic paints from photographs of paint pots and bottles.

The user photographs their paint collection (Citadel pots, Army Painter dropper bottles, Vallejo dropper bottles, possibly others). For every distinct paint you can see, read the label and report the brand, product range, paint name and product code.

Rules:
- Read what is printed. Do not guess a name from the cap colour alone; if the label is unreadable, still report the pot with brand (if identifiable from the bottle shape/branding), an empty name, a low confidence and the hexGuess of the visible colour.
- Prefer the exact spelling from the catalog below. If the label matches a catalog entry, use the catalog name and code verbatim.
- Vallejo bottles print a code like 70.950 or 72.001 — always report it when legible; it is the most reliable identifier. Army Painter classic Warpaints print codes like WP1102 and Fanatic bottles WP3001.
- Citadel pots have no code. Their range (Base / Layer / Shade / Contrast / Technical / Dry / Air) is printed on the pot lid or label.
- Report each distinct paint once, with count = number of identical pots.
- Confidence: 0.9+ only when brand and full name are clearly legible; 0.5–0.8 when partially legible; below 0.5 when inferred.
- Brands other than Citadel, The Army Painter and Vallejo: brand "other", with the manufacturer's name at the start of labelText.
- Add a caveat for anything cut off, blurred, or seen only from the side.

Reference catalog (brand, range, optional code, name):
${catalogListing()}`;
  return systemPrompt;
}

export class RecognitionError extends Error {
  constructor(message: string, public readonly kind: "auth" | "rate" | "request" | "refusal" | "parse" | "network" | "other") {
    super(message);
  }
}

export async function recognizeImages(images: ImageInput[], apiKey: string, model: string): Promise<RecognitionResult> {
  if (!apiKey) throw new RecognitionError("Add your Anthropic API key in settings first.", "auth");
  if (images.length === 0) throw new RecognitionError("No images supplied.", "request");
  if (images.length > MAX_IMAGES) throw new RecognitionError(`At most ${MAX_IMAGES} images per scan.`, "request");

  // The key belongs to the person using this browser and never leaves their device except to Anthropic.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const content: Anthropic.ContentBlockParam[] = [
    ...images.map<Anthropic.ImageBlockParam>((img) => ({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } })),
    { type: "text", text: `Identify every paint pot or bottle visible in ${images.length === 1 ? "this photo" : "these photos"}. If the same pot appears in more than one photo, report it once.` },
  ];

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 16000,
      system: [{ type: "text", text: system(), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(RecognitionSchema) },
    });

    if (response.stop_reason === "refusal") throw new RecognitionError("The model declined to process these images.", "refusal");
    const parsed = response.parsed_output;
    if (!parsed) throw new RecognitionError("The model returned an unparseable result; please try again.", "parse");

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

    return {
      matches: matchAll(detections),
      caveats: parsed.caveats,
      usage: {
        model: response.model,
        inputTokens: response.usage.input_tokens,
        cachedTokens: response.usage.cache_read_input_tokens ?? 0,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (err) {
    if (err instanceof RecognitionError) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new RecognitionError("Anthropic rejected the API key. Check it in settings.", "auth");
    if (err instanceof Anthropic.RateLimitError) throw new RecognitionError("Rate limited by Anthropic; wait a moment and retry.", "rate");
    if (err instanceof Anthropic.BadRequestError) throw new RecognitionError(`Anthropic rejected the request: ${err.message}`, "request");
    if (err instanceof Anthropic.APIConnectionError) throw new RecognitionError("Could not reach the Anthropic API. Check your connection.", "network");
    if (err instanceof Anthropic.APIError) throw new RecognitionError(`Anthropic API error ${err.status}: ${err.message}`, "other");
    throw new RecognitionError(err instanceof Error ? err.message : "Unexpected error", "other");
  }
}
