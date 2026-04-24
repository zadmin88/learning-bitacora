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
      const res = await fetch(`${baseUrl}/@cf/meta/llama-3.1-8b-instruct`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2048,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw Object.assign(new Error(`Cloudflare AI error: ${res.status} ${body}`), {
          status: res.status,
        });
      }
      const data = (await res.json()) as {
        result: { response: string };
        success: boolean;
      };
      return data.result.response;
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

// Returns the active provider based on env vars, or null for mock mode
// Priority: Cloudflare (free) > Gemini > null (mock)
export function getProvider(): AIProvider | null {
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_AI_API_TOKEN;
  if (cfAccountId && cfToken) {
    return createCloudflareProvider(cfAccountId, cfToken);
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return createGeminiProvider(geminiKey);
  }

  return null;
}

export const EMBEDDING_DIMENSIONS = 768;
