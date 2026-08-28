export const handler = async (event: any) => {
  console.log("Generation request started");

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const { what_are_we_promoting, things_to_mention, what_do_you_need, how_should_it_sound, who_are_you_talking_to, where_will_it_go, how_long } = JSON.parse(event.body);

  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY");
    return { statusCode: 500, body: JSON.stringify({ error: "Missing API key configuration" }) };
  }

  const systemPrompt = `You are an AI content generator for ShopSphere Africa, a marketplace platform helping small business sellers create marketing content. Your users are busy sellers with no professional writing experience, so you write on their behalf using only what they tell you.

STRICT RULES:
1. FACT LOCK: Only use facts explicitly provided. Never invent specifications, statistics, prices, sourcing, origin, suppliers, certifications, or quality/consistency/freshness/performance claims not given. If an expected detail is missing, use a placeholder like [ADD PRICE] instead of guessing.
2. CONFIDENCE FLAGGING: Wrap ONLY sentences containing:
   - A specific number, statistic, price, or date
   - A clear comparative or superlative claim ("best," "#1," "guaranteed," "unmatched")
   - A specific factual claim about product performance, safety, duration, quality, consistency, or freshness (e.g., "stays fresh longer," "reduces waste," "consistent," "wholesome," "trusted").
Do NOT flag general marketing tone, casual phrasing, or vague enthusiasm ("ready to roll," "in style," "your new favorite"). Flagging should be selective; aim for 0-2 flagged sentences per generation.
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
    console.log("Calling Groq API...");
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

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Groq API error:", response.status, errorData);
      return { statusCode: response.status, body: JSON.stringify({ error: `Groq API error: ${response.statusText}` }) };
    }

    const data = await response.json();
    console.log("Groq API responded");
    
    const content = data.choices[0].message.content.replace(/```json\n?|\n?```/g, '');
    const parsedContent = JSON.parse(content);
    
    console.log("Generation successful, returning response");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedContent)
    };
  } catch (error) {
    console.error("Generation failed:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate content" }) };
  }
};
