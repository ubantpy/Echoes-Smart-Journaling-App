const BACKEND_URL = "https://echoes-backend.vercel.app";

/**  Sends concatenated entry texts to the backend and returns the generated echo text
Returns null on any failure - caller handles the fallback*/
export async function fetchSummary(text: string): Promise<string | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/summarise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.summary ?? null;
  } 
  catch {
    // Network failure or backend error - silently return null
    return null;
  }
}