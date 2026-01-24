import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  if (!API_URL) {
    throw new Error(
      "VITE_API_URL is missing. Add it to ui/.env and restart 'npm run dev'."
    );
  }

  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated (no currentUser).");

  const token = await user.getIdToken();

  const { method = "GET", body, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  // citim ca text ca să nu crape dacă serverul trimite HTML (404 etc.)
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `API error ${res.status}`);
  }

  return data;
}
