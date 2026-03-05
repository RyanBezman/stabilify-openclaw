import type { LlmChatMessage, LlmClient, LlmJsonResult } from "./llmClient.ts";

export class OpenAiLlmClient implements LlmClient {
  constructor(private readonly openAiKey: string) {}

  async generateJson<T>(args: {
    model: string;
    schemaName: string;
    schema: Record<string, unknown>;
    messages: LlmChatMessage[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LlmJsonResult<T>> {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: args.model,
        temperature: args.temperature ?? 0.2,
        max_tokens: args.maxTokens ?? 700,
        messages: args.messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: args.schemaName,
            strict: true,
            schema: args.schema,
          },
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`OpenAI error: ${resp.status} ${errText}`);
    }

    const payload = await resp.json();
    const raw = payload?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) {
      throw new Error("OpenAI JSON response missing content.");
    }

    return {
      model: args.model,
      data: JSON.parse(raw) as T,
    };
  }
}
