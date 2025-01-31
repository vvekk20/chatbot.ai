import { useState } from "react";

export function useHandleStreamResponse({ onChunk, onFinish }) {
  const [error, setError] = useState(null);

  const handleResponse = async (response) => {
    try {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let message = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        message += chunk;

        if (onChunk) onChunk(chunk);
      }

      if (onFinish) onFinish(message);
    } catch (err) {
      setError(err);
      console.error("Error handling stream:", err);
    }
  };

  return { handleResponse, error };
}