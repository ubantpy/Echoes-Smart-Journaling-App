const BASE_URL = "https://echoes-backend.vercel.app";

export type TranscribeResult =
  | { success: true; text: string }
  | { success: false; reason: "timeout" | "error" };

export async function transcribeAudio(fileUri: string): Promise<TranscribeResult> {
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${BASE_URL}/api/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: base64 }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await res.json();

    return data.text
      ? { success: true, text: data.text }
      : { success: false, reason: "error" };

  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, reason: "timeout" };
    }
    return { success: false, reason: "error" };
  }
}