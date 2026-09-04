/** Zod schema shared by the API route (structured output) and the client (response typing). */
import { z } from "zod";

export const DetectionSchema = z.object({
  brand: z.enum(["citadel", "army_painter", "vallejo", "other", "unknown"]).describe("Manufacturer read from the pot"),
  range: z.string().describe("Product line printed on the label (e.g. 'Layer', 'Speedpaint 2.0', 'Model Color'); empty string if not visible"),
  name: z.string().describe("Paint name exactly as printed on the label"),
  code: z.string().describe("Product code printed on the label (e.g. '70.950', 'WP3001'); empty string if none"),
  confidence: z.number().min(0).max(1).describe("How sure you are of the brand + name reading"),
  count: z.number().int().min(1).describe("How many identical pots of this paint are visible"),
  labelText: z.string().describe("Verbatim text you could read on the label, useful when the name is uncertain"),
  hexGuess: z.string().describe("Approximate sRGB hex of the paint colour from the cap/swatch, e.g. '#7A1B1B'; empty string if not visible"),
});

export const RecognitionSchema = z.object({
  detections: z.array(DetectionSchema),
  /** Free-text caveats: blurry pots, cut-off labels, pots seen only from the side. */
  caveats: z.array(z.string()),
});

export type RecognitionOutput = z.infer<typeof RecognitionSchema>;
