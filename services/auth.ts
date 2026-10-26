const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

export async function login(
  email: string,
  password: string
) {
  const response = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Login failed");
  }

  return response.json();
}

export async function signup(
  name: string,
  email: string,
  password: string
) {
  const response = await fetch(
    `${API_URL}/api/auth/signup`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Signup failed");
  }

  return response.json();
}

export async function logout() {
  const response = await fetch(
    `${API_URL}/api/auth/logout`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  return response.json();
}

export async function getCurrentUser() {
  const response = await fetch(
    `${API_URL}/api/auth/me`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}
