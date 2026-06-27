export async function getStatus() {
  const response = await fetch('/api/status');

  if (!response.ok) {
    throw new Error('API status error');
  }

  return await response.json();
}

export async function sendChatMessage({ message, history = [], useSearch = true }) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      history,
      useSearch
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка GALAI API');
  }

  return data;
}
