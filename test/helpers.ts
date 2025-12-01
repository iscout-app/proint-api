import { server } from "../src/index";

/**
 * Helper to login and get authentication token
 */
export async function login(email: string, password: string) {
  const response = await server.handle(
    new Request("http://localhost/v1/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );

  // Extract token from Set-Cookie header
  const setCookie = response.headers.get("Set-Cookie");
  const token = setCookie?.match(/auth=([^;]+)/)?.[1];

  return { response, token: token || null };
}

/**
 * Helper to create an authenticated request
 */
export function createAuthenticatedRequest(
  url: string,
  method: string,
  token: string,
  body?: any,
) {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: `auth=${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Test users from seed data
 */
export const TEST_USERS = {
  joao: {
    email: "joao@example.com",
    password: "password123",
    name: "João Silva",
  },
  maria: {
    email: "maria@example.com",
    password: "password123",
    name: "Maria Santos",
  },
  pedro: {
    email: "pedro@example.com",
    password: "password123",
    name: "Pedro Costa",
  },
};
