export async function callOpenRouter(prompt: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is missing');
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      "X-Title": "Espionage Round 2 Evaluator"
    },
    body: JSON.stringify({
      "model": model,
      "messages": [
        { "role": "user", "content": prompt }
      ],
      "temperature": 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
