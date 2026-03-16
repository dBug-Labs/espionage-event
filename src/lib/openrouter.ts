export async function callOpenRouter(prompt: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is missing');

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "anthropic/claude-3.5-sonnet",
      "messages": [
        { "role": "user", "content": prompt }
      ]
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
