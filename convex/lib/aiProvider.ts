"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIProvider {
  generateText(systemPrompt: string, userPrompt: string): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  embeddingDimensions: number;
}

// Cloudflare Workers AI — free tier (10k req/day)
function createCloudflareProvider(
  accountId: string,
  apiToken: string
): AIProvider {
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  return {
    embeddingDimensions: 768,

    async generateText(systemPrompt: string, userPrompt: string) {
      const res = await fetch(`${baseUrl}/@cf/moonshotai/kimi-k2.6`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4096,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw Object.assign(new Error(`Cloudflare AI error: ${res.status} ${body}`), {
          status: res.status,
        });
      }
      const data = await res.json() as Record<string, any>;
      // Cloudflare models may return { result: { response: "..." } }
      // or { result: { choices: [{ message: { content: "..." } }] } }
      const message = data.result?.choices?.[0]?.message;
      const response =
        data.result?.response ??
        message?.content ??
        message?.reasoning_content ??
        data.result?.content;
      if (!response) {
        throw new Error(`Unexpected Cloudflare AI response shape: ${JSON.stringify(data).slice(0, 500)}`);
      }
      return response;
    },

    async generateEmbedding(text: string) {
      const res = await fetch(`${baseUrl}/@cf/baai/bge-base-en-v1.5`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: [text] }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw Object.assign(new Error(`Cloudflare AI error: ${res.status} ${body}`), {
          status: res.status,
        });
      }
      const data = (await res.json()) as {
        result: { data: number[][] };
        success: boolean;
      };
      return data.result.data[0];
    },
  };
}

// Google Gemini provider
function createGeminiProvider(apiKey: string): AIProvider {
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    embeddingDimensions: 3072,

    async generateText(systemPrompt: string, userPrompt: string) {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt,
      });
      const result = await model.generateContent(userPrompt);
      return result.response.text();
    },

    async generateEmbedding(text: string) {
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    },
  };
}

// Combines a primary text provider (with fallback on 429) and a separate
// embedding provider. Embeddings never fall back between providers: vectors
// from different models aren't comparable, and the schema's vector index is
// fixed at EMBEDDING_DIMENSIONS — mixing models would corrupt semantic search.
function combineProviders(
  text: AIProvider,
  textFallback: AIProvider | null,
  embeddings: AIProvider
): AIProvider {
  return {
    embeddingDimensions: embeddings.embeddingDimensions,

    async generateText(systemPrompt: string, userPrompt: string) {
      try {
        return await text.generateText(systemPrompt, userPrompt);
      } catch (error: unknown) {
        if ((error as { status?: number })?.status === 429 && textFallback) {
          console.warn(
            "Primary AI provider quota exceeded (429) — falling back for text generation"
          );
          return await textFallback.generateText(systemPrompt, userPrompt);
        }
        throw error;
      }
    },

    async generateEmbedding(text: string) {
      return await embeddings.generateEmbedding(text);
    },
  };
}

// Returns the active provider based on env vars, or null for mock mode.
// Text generation prefers Gemini (generous free tier, fast), falling back to
// Cloudflare on quota errors. Embeddings stay on Cloudflare (768 dims,
// matches the schema's vector index) until a migration changes that.
export function getProvider(): AIProvider | null {
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_AI_API_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;

  const cloudflare =
    cfAccountId && cfToken ? createCloudflareProvider(cfAccountId, cfToken) : null;
  const gemini = geminiKey ? createGeminiProvider(geminiKey) : null;

  if (gemini && cloudflare) {
    return combineProviders(gemini, cloudflare, cloudflare);
  }
  if (gemini) {
    return gemini;
  }
  return cloudflare;
}

export const EMBEDDING_DIMENSIONS = 768;
