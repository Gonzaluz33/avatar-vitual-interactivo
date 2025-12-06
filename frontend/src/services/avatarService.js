const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5175'

async function speak(text) {
  const response = await fetch(`${API_BASE}/avatar/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    throw new Error('Error solicitando el avatar')
  }

  return response.json()
}

export const avatarService = {
  speak,
  baseUrl: API_BASE,
}
