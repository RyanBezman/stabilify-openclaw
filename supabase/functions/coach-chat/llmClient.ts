export type LlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmJsonResult<T> = {
  model: string;
  data: T;
};

export interface LlmClient {
  generateJson<T>(args: {
    model: string;
    schemaName: string;
    schema: Record<string, unknown>;
    messages: LlmChatMessage[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LlmJsonResult<T>>;
}
