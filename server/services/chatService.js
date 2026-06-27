import { memory } from "../memory/memory.js";

export async function buildChatContext({
  userId,
  message,
  history = []
}) {
  const memoryHistory = memory.get(userId);

  return {
    message,
    history,
    memory: memoryHistory
  };
}

export async function saveConversation({
  userId,
  userMessage,
  assistantMessage
}) {
  memory.save(userId, "user", userMessage);

  if (assistantMessage) {
    memory.save(userId, "assistant", assistantMessage);
  }
}
