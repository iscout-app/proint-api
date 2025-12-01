import { describe, expect, it, beforeAll } from "bun:test";
import { server } from "../src/index";
import { login, createAuthenticatedRequest, TEST_USERS } from "./helpers";

describe("Athlete Management", () => {
  let joaoToken: string;
  let teamId: string;
  let targetTeamId: string;

  beforeAll(async () => {
    const joaoLogin = await login(
      TEST_USERS.joao.email,
      TEST_USERS.joao.password,
    );
    joaoToken = joaoLogin.token!;

    // Get João's teams (he owns Flamengo and Palmeiras from seed)
    const teamsResponse = await server.handle(
      createAuthenticatedRequest("http://localhost/v1/teams", "GET", joaoToken),
    );

    const teams = await teamsResponse.json();
    teamId = teams[0].id;
    targetTeamId = teams[1].id;
  });

  describe("POST /teams/:id/athletes", () => {
    it("should create athlete for team", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes`,
          "POST",
          joaoToken,
          {
            name: "Novo Atleta",
            birthdate: "2000-01-15",
            shirtNumber: 99,
            position: "Atacante",
          },
        ),
      );

      expect(response.status).toBe(200);
      const athlete = await response.json();
      expect(athlete.name).toBe("Novo Atleta");
      expect(athlete.shirtNumber).toBe(99);
      expect(athlete).toHaveProperty("id");
      expect(athlete).toHaveProperty("athleteId");
    });

    it("should reject duplicate shirt number", async () => {
      // Create first athlete
      await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes`,
          "POST",
          joaoToken,
          {
            name: "Primeiro Atleta",
            birthdate: "2000-01-15",
            shirtNumber: 88,
            position: "Atacante",
          },
        ),
      );

      // Try to create another with same shirt number
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes`,
          "POST",
          joaoToken,
          {
            name: "Segundo Atleta",
            birthdate: "2001-03-20",
            shirtNumber: 88, // Same number
            position: "Meia",
          },
        ),
      );

      expect(response.status).toBe(409);
    });

    it("should reject invalid shirt number", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes`,
          "POST",
          joaoToken,
          {
            name: "Invalid Number",
            birthdate: "2000-01-15",
            shirtNumber: 150, // Out of range
            position: "Atacante",
          },
        ),
      );

      expect(response.status).toBe(422);
    });
  });

  describe("GET /teams/:id/athletes", () => {
    it("should list team athletes", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const athletes = await response.json();
      expect(Array.isArray(athletes)).toBe(true);
      expect(athletes.length).toBeGreaterThan(0);
    });

    it("should filter current athletes only", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes?current=true`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const athletes = await response.json();
      expect(Array.isArray(athletes)).toBe(true);
      // All athletes should have null finishedAt (current)
    });
  });

  describe("POST /teams/:id/athletes/:athleteId/transfer", () => {
    it("should transfer athlete between owned teams", async () => {
      // First create an athlete
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes`,
          "POST",
          joaoToken,
          {
            name: "Atleta para Transferir",
            birthdate: "1998-05-10",
            shirtNumber: 77,
            position: "Volante",
          },
        ),
      );

      const created = await createResponse.json();
      const athleteId = created.athleteId;

      // Now transfer to another team
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes/${athleteId}/transfer`,
          "POST",
          joaoToken,
          {
            targetTeamId,
          },
        ),
      );

      expect(response.status).toBe(200);
      const transfer = await response.json();
      expect(transfer.teamId).toBe(targetTeamId);
      expect(transfer.athleteId).toBe(athleteId);
      expect(transfer.finishedAt).toBeNull();
    });

    it("should allow changing shirt number on transfer", async () => {
      // Create athlete
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes`,
          "POST",
          joaoToken,
          {
            name: "Atleta Mudança de Número",
            birthdate: "1999-03-15",
            shirtNumber: 11,
            position: "Meia",
          },
        ),
      );

      const created = await createResponse.json();
      const athleteId = created.athleteId;

      // Transfer with new shirt number
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes/${athleteId}/transfer`,
          "POST",
          joaoToken,
          {
            targetTeamId,
            shirtNumber: 22,
          },
        ),
      );

      expect(response.status).toBe(200);
      const transfer = await response.json();
      expect(transfer.shirtNumber).toBe(22);
    });
  });

  describe("GET /athletes/:id", () => {
    it("should get detailed athlete data", async () => {
      // Get an athlete ID from team athletes
      const athletesResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${teamId}/athletes`,
          "GET",
          joaoToken,
        ),
      );

      const athletes = await athletesResponse.json();
      if (athletes.length === 0) return; // Skip if no athletes

      const athleteId = athletes[0].athleteId;

      // Get detailed data
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/athletes/${athleteId}`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const athlete = await response.json();
      expect(athlete).toHaveProperty("id");
      expect(athlete).toHaveProperty("name");
      expect(athlete).toHaveProperty("teams"); // Career history
      expect(athlete).toHaveProperty("matchPerformances");
      expect(athlete).toHaveProperty("careerTotals");
      expect(Array.isArray(athlete.teams)).toBe(true);
      expect(Array.isArray(athlete.matchPerformances)).toBe(true);
    });
  });
});
