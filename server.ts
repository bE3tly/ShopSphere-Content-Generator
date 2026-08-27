import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import 'dotenv/config';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/generate", async (req, res) => {
    const { what_are_we_promoting, things_to_mention, what_do_you_need, how_should_it_sound, who_are_you_talking_to, where_will_it_go, how_long } = req.body;

    const systemPrompt = `You are an AI content generator for ShopSphere Africa, a marketplace platform helping small business sellers create marketing content. Your users are busy sellers with no professional writing experience, so you write on their behalf using only what they tell you.

STRICT RULES:
1. FACT LOCK: Only use facts explicitly provided. Never invent specifications, statistics, prices, or claims not given. If an expected detail is missing, use a placeholder like [ADD PRICE] instead of guessing.
2. CONFIDENCE FLAGGING: Wrap ALL sentences that contain:
   - Specific numbers, statistics, prices, or dates
   - Any comparative or superlative claim (e.g., "best", "most", "#1", "fastest", "guaranteed", "unmatched")
   - Any product benefit, quality, or performance claim (e.g., "long-lasting", "sophisticated", "durable", "easy to use")
   in [VERIFY: sentence text] tags. Flagging is better than missing a claim; when in doubt, wrap it.
3. Flagged content always requires human confirmation before publishing.

WORD COUNT CONSTRAINTS:
- Quick: under 60 words
- Medium: 120-180 words
- Detailed: 280-350 words

Respond ONLY in this exact JSON structure, nothing else:
{
  "headlines": ["3 alternative headline options"],
  "body": "the main content, with [VERIFY: ...] tags where needed",
  "cta": "one suggested call-to-action",
  "keywords": ["5-8 relevant keywords"],
  "verification_flags": ["exact flagged sentences, plain text"],
  "tone_notes": "one sentence on how the tone/audience shaped the writing"
}
No markdown fences, no preamble, no text outside the JSON object.`;

    const userPrompt = `Generate ${what_do_you_need} for ${where_will_it_go} with a ${how_should_it_sound} tone for ${who_are_you_talking_to}. Length: ${how_long}.
    Promoting: ${what_are_we_promoting}
    Things to mention: ${JSON.stringify(things_to_mention)}`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
          }),
        });

        const data = await response.json();
        console.log("Raw API Response:", data);
        const content = data.choices[0].message.content.replace(/```json\n?|\n?```/g, '');
        res.json(JSON.parse(content));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate content" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
