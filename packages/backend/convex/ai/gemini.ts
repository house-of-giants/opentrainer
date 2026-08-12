interface GeminiCallOptions {
  systemPrompt: string;
  userMessage: string;
  responseFormat?: "json" | "text";
  maxTokens?: number;
}

interface GeminiResponse {
  text: string;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callGemini(options: GeminiCallOptions): Promise<GeminiResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable not set");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://opentrainer.app",
      "X-Title": "OpenTrainer",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userMessage },
      ],
      max_tokens: options.maxTokens ?? 1024,
      ...(options.responseFormat === "json" && {
        response_format: { type: "json_object" },
      }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = data.choices[0]?.message?.content ?? "";

  return {
    text: content,
    usageMetadata: {
      promptTokenCount: data.usage?.prompt_tokens ?? 0,
      candidatesTokenCount: data.usage?.completion_tokens ?? 0,
      totalTokenCount: data.usage?.total_tokens ?? 0,
    },
  };
}
