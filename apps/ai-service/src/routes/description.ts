import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db.js";
import { cache } from "../lib/cache.js";
import { openrouter } from "../services/openrouter.js";

const DescriptionSchema = z.object({
  vehicle: z.object({
    make: z.string(),
    model: z.string(),
    year: z.number().int(),
    mileageKm: z.number().int().optional(),
    fuelType: z.string().optional(),
    transmission: z.string().optional(),
    bodyType: z.string().optional(),
    color: z.string().optional(),
    condition: z.string().optional(),
    features: z.array(z.string()).optional(),
    priceAmount: z.number().int().optional(),
    priceCurrency: z.string().optional(),
  }),
  locale: z.enum(["tr", "en", "ar", "fa", "ku-bad", "ku-sor"]).default("tr"),
  tone: z.enum(["professional", "casual", "enthusiastic"]).default("professional"),
  maxLength: z.number().int().min(100).max(2000).default(600),
  highlights: z.array(z.string()).optional(),
});

export async function descriptionRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /ai/generate-description
   * Body: { vehicle: {...}, locale, tone, maxLength, highlights[] }
   * Returns: { description, model, costUsd }
   */
  app.post("/ai/generate-description", async (req, reply) => {
    const parsed = DescriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    const { vehicle, locale, tone, maxLength, highlights } = parsed.data;

    const cacheKey = `desc:${hashVehicle(vehicle)}:${locale}:${tone}:${maxLength}`;
    const cached = await cache.get<{ description: string }>(cacheKey);
    if (cached) return reply.send({ ...cached, cached: true });

    const localeName = {
      tr: "Türkçe",
      en: "English",
      ar: "Arabic (formal)",
      fa: "Persian",
      "ku-bad": "Kurdish (Kirmancki/Badini, Latin script)",
      "ku-sor": "Kurdish (Sorani, Arabic script)",
    }[locale];

    const toneDesc = {
      professional: "professional and trustworthy",
      casual: "casual and friendly",
      enthusiastic: "enthusiastic and selling-focused",
    }[tone];

    const featuresList = vehicle.features?.length
      ? `\nÖzellikler: ${vehicle.features.join(", ")}`
      : "";
    const highlightsList = highlights?.length
      ? `\nÖzellikle vurgulanacaklar: ${highlights.join(", ")}`
      : "";

    const prompt = `Sen otomotiv sektöründe uzman bir ilan açıklaması yazarısın. Aşağıdaki araç için ${localeName} dilinde, ${toneDesc} tonda, en fazla ${maxLength} karakter uzunluğunda bir ilan açıklaması yaz.

ARAÇ BİLGİLERİ:
- Marka/Model: ${vehicle.make} ${vehicle.model}
- Yıl: ${vehicle.year}
- Kilometre: ${vehicle.mileageKm?.toLocaleString() ?? "belirtilmemiş"} km
- Yakıt: ${vehicle.fuelType ?? "—"}
- Vites: ${vehicle.transmission ?? "—"}
- Kasa: ${vehicle.bodyType ?? "—"}
- Renk: ${vehicle.color ?? "—"}
- Durum: ${vehicle.condition ?? "used"}${featuresList}${highlightsList}

KURALLAR:
- Samimi ama profesyonel ol
- Spesifik özellikleri vurgula (kilometre düşükse, tek sahip, vs.)
- Şartlı/zorlama pazarlama dilinden kaçın
- Liste veya madde işareti KULLANMA, düz paragraf olarak yaz
- Markdown formatı KULLANMA, sadece düz metin
- ${vehicle.year} modeli gibi spesifik yıl bilgisini mutlaka belirt
- Sadece açıklamayı yaz, "İşte açıklama:" gibi giriş metni EKLEME

Yaz:`;

    try {
      const result = await openrouter.chat({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You write car listing descriptions in ${localeName}. Output only the description text, no preamble.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        maxTokens: Math.ceil(maxLength / 2),
      });

      const description = result.content.trim();
      await cache.set(cacheKey, { description }, 60 * 60 * 24);

      const userId = (req.headers["x-user-id"] as string) ?? null;
      await db.query(
        `INSERT INTO public.ai_jobs (user_id, type, status, payload, result, model_used, cost_usd, duration_ms, completed_at)
         VALUES ($1, 'description', 'completed', $2, $3, $4, $5, $6, now())`,
        [
          userId,
          JSON.stringify({ locale, tone }),
          JSON.stringify({ description }),
          result.model,
          result.costUsd,
          result.durationMs,
        ],
      );

      return reply.send({
        description,
        model: result.model,
        costUsd: result.costUsd,
        cached: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "description_failed";
      return reply.code(502).send({ error: msg });
    }
  });
}

function hashVehicle(v: Record<string, unknown>): string {
  const key = JSON.stringify(v, Object.keys(v).sort());
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h << 5) - h + key.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}