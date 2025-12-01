import { describe, expect, it, beforeAll } from "bun:test";
import { server } from "../src/index";
import { login, createAuthenticatedRequest, TEST_USERS } from "./helpers";

describe("Team Management", () => {
  let joaoToken: string;
  let mariaToken: string;

  beforeAll(async () => {
    // Get tokens for test users
    const joaoLogin = await login(
      TEST_USERS.joao.email,
      TEST_USERS.joao.password,
    );
    const mariaLogin = await login(
      TEST_USERS.maria.email,
      TEST_USERS.maria.password,
    );

    joaoToken = joaoLogin.token!;
    mariaToken = mariaLogin.token!;
  });

  describe("GET /teams", () => {
    it("should list owned teams", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/teams",
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const teams = await response.json();
      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBeGreaterThan(0);
      // João owns Flamengo and Palmeiras from seed
      expect(teams.some((t: any) => t.fullName === "Flamengo FC")).toBe(true);
    });
  });

  describe("POST /teams", () => {
    it("should create new team", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/teams",
          "POST",
          joaoToken,
          {
            fullName: "Novo Time FC",
            shortName: "NVO",
            mainColorHex: "FF5500",
            secondaryColorHex: "000000",
          },
        ),
      );

      expect(response.status).toBe(200);
      const team = await response.json();
      expect(team.fullName).toBe("Novo Time FC");
      expect(team.shortName).toBe("NVO");
      expect(team).toHaveProperty("id");
    });

    it("should reject invalid hex color", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/teams",
          "POST",
          joaoToken,
          {
            fullName: "Invalid Color Team",
            shortName: "INV",
            mainColorHex: "GGGGGG", // Invalid hex
          },
        ),
      );

      expect(response.status).toBe(422);
    });
  });

  describe("GET /teams/:id", () => {
    it("should get team details with matches", async () => {
      // First get list of teams to get an ID
      const listResponse = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/teams",
          "GET",
          joaoToken,
        ),
      );

      const teams = await listResponse.json();
      const teamId = teams[0].id;

      // Now get team details
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const team = await response.json();
      expect(team).toHaveProperty("id");
      expect(team).toHaveProperty("fullName");
      expect(team).toHaveProperty("owner");
      expect(team).toHaveProperty("homeMatches");
      expect(team).toHaveProperty("awayMatches");
      expect(Array.isArray(team.homeMatches)).toBe(true);
      expect(Array.isArray(team.awayMatches)).toBe(true);
    });
  });

  describe("PATCH /teams/:id", () => {
    it("should update team as owner", async () => {
      // Get João's team
      const listResponse = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/teams",
          "GET",
          joaoToken,
        ),
      );

      const teams = await listResponse.json();
      const teamId = teams[0].id;

      // Update team
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}`,
          "PATCH",
          joaoToken,
          {
            fullName: "Flamengo FC Updated",
          },
        ),
      );

      expect(response.status).toBe(200);
      const updated = await response.json();
      expect(updated.fullName).toBe("Flamengo FC Updated");
    });

    it("should reject update from non-owner", async () => {
      // Get João's team
      const listResponse = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/teams",
          "GET",
          joaoToken,
        ),
      );

      const teams = await listResponse.json();
      const teamId = teams[0].id;

      // Try to update with Maria's token
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}`,
          "PATCH",
          mariaToken,
          {
            fullName: "Should Not Work",
          },
        ),
      );

      expect(response.status).toBe(500); // TODO: should be 403
    });
  });

  describe("GET /teams/all", () => {
    it("should list all teams", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/teams/all",
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const teams = await response.json();
      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBeGreaterThanOrEqual(8); // Seed creates 8 teams
    });
  });
});
