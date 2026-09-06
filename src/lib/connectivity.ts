const BASE_URL = "https://echoes-backend.vercel.app";

/** Pings the backend with a short timeout to check if the network is available.
 * Returns true if reachable, false if offline or too slow */
export async function isConnected(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(BASE_URL, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok || res.status < 500;
  }
  catch {
    return false;
  }
}