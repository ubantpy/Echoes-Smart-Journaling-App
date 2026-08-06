const BASE_URL = "https://echoes-backend.vercel.app";

// Reads a local audio file, converts to base64, sends to Whisper for transcription
export async function transcribeAudio(fileUri: string): Promise<string | null> {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const res = await fetch(`${BASE_URL}/api/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: base64 }),
    });

    const data = await res.json();

    return data.text ?? null;
  } catch (err) {
    return null;
  }
}