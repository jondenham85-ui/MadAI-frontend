const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://madai-backend-clean.onrender.com";

async function parseJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Login failed");
  }

  return payload;
}

export async function signup(name: string, email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      password,
    }),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Signup failed");
  }

  return payload;
}

export async function logout() {
  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    return {
      success: false,
      error: payload.error || payload.message || "Logout failed",
    };
  }

  return payload;
}

export async function getCurrentUser() {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = await parseJson(response);
  return payload.user ?? payload;
}
