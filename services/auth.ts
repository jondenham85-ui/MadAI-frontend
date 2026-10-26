const API_URL =
  process.env.NEXT_PUBLIC_API_URL;

export async function login(
  email: string,
  password: string
) {
  return fetch(
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
}

export async function signup(
  name: string,
  email: string,
  password: string
) {
  return fetch(
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
}
