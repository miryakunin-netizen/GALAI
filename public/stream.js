export async function streamChatMessage({
  message,
  onChunk,
  onError,
  onDone
}) {
  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message
      })
    });

    if (!response.ok) {
      throw new Error("Streaming API error");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, {
        stream: true
      });

      if (chunk && onChunk) {
        onChunk(chunk);
      }
    }

    if (onDone) {
      onDone();
    }

  } catch (e) {
    if (onError) {
      onError(e);
    }
  }
}
