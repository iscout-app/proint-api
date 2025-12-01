import { describe, expect, it } from "bun:test";
import { server } from "../src/index";
import { TEST_USERS } from "./helpers";

describe("Authentication", () => {
  describe("Sign Up", () => {
    it("should create new user with valid data", async () => {
      const response = await server.handle(
        new Request("http://localhost/v1/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: `test${Date.now()}@example.com`,
            password: "password123",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("id");
      expect(data.data).toHaveProperty("name");
      expect(data.data).not.toHaveProperty("password");
    });

    it("should reject duplicate email", async () => {
      const response = await server.handle(
        new Request("http://localhost/v1/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Duplicate User",
            email: TEST_USERS.joao.email,
            password: "password123",
          }),
        }),
      );

      expect(response.status).toBe(409);
    });

    it("should reject invalid email format", async () => {
      const response = await server.handle(
        new Request("http://localhost/v1/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Invalid Email",
            email: "not-an-email",
            password: "password123",
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it("should reject short password", async () => {
      const response = await server.handle(
        new Request("http://localhost/v1/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Short Password",
            email: "test@example.com",
            password: "123",
          }),
        }),
      );

      expect(response.status).toBe(422);
    });
  });

  describe("Sign In", () => {
    it("should sign in with valid credentials", async () => {
      const response = await server.handle(
        new Request("http://localhost/v1/auth/sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: TEST_USERS.joao.email,
            password: TEST_USERS.joao.password,
          }),
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("id");
      expect(data.data.email).toBe(TEST_USERS.joao.email);

      // Check for auth cookie
      const setCookie = response.headers.get("Set-Cookie");
      expect(setCookie).toContain("auth=");
    });

    it("should reject invalid email", async () => {
      const response = await server.handle(
        new Request("http://localhost/v1/auth/sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "nonexistent@example.com",
            password: "password123",
          }),
        }),
      );

      expect(response.status).toBe(401);
    });

    it("should reject invalid password", async () => {
      const response = await server.handle(
        new Request("http://localhost/v1/auth/sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: TEST_USERS.joao.email,
            password: "wrongpassword",
          }),
        }),
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Protected Routes", () => {
    it("should reject request without token", async () => {
      const response = await server.handle(
        new Request("http://localhost/v1/teams", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      );

      expect(response.status).toBe(401);
    });

    it("should accept request with valid token", async () => {
      // First login
      const loginResponse = await server.handle(
        new Request("http://localhost/v1/auth/sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: TEST_USERS.joao.email,
            password: TEST_USERS.joao.password,
          }),
        }),
      );

      const setCookie = loginResponse.headers.get("Set-Cookie");
      const token = setCookie?.match(/auth=([^;]+)/)?.[1];

      // Then access protected route
      const response = await server.handle(
        new Request("http://localhost/v1/teams", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `auth=${token}`,
          },
        }),
      );

      expect(response.status).toBe(200);
    });
  });
});
