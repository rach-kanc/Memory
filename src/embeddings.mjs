export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return 0;
  }
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function createEmbeddingService({ provider = "mock", apiKey = "", endpoint = "", dimension = 1536 } = {}) {
  return {
    provider,
    dimension,
    async getEmbedding(text) {
      const cleanText = String(text || "").trim();
      if (!cleanText) {
        return new Array(dimension).fill(0);
      }
      
      if (provider === "mock") {
        // Deterministic mock embedding based on character codes
        const embedding = new Array(dimension).fill(0);
        for (let i = 0; i < cleanText.length; i++) {
          const val = cleanText.charCodeAt(i);
          embedding[i % dimension] += val;
        }
        // Normalize the vector
        let sumSq = 0;
        for (let i = 0; i < dimension; i++) {
          sumSq += embedding[i] * embedding[i];
        }
        const magnitude = Math.sqrt(sumSq) || 1;
        for (let i = 0; i < dimension; i++) {
          embedding[i] /= magnitude;
        }
        return embedding;
      }
      
      if (provider === "openai") {
        const url = endpoint || "https://api.openai.com/v1/embeddings";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            input: cleanText,
            model: "text-embedding-3-small",
          }),
        });
        if (!response.ok) {
          throw new Error(`OpenAI Embeddings API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.data[0].embedding;
      }

      throw new Error(`Unsupported embedding provider: ${provider}`);
    },
  };
}
