import { describe, expect, it, beforeAll } from "bun:test";
import { server } from "../src/index";
import { login, createAuthenticatedRequest, TEST_USERS } from "./helpers";
import { db } from "../src/index";
import { athleteCareer } from "../src/db/schema";
import { and, eq } from "drizzle-orm";

describe("Match Management", () => {
  let joaoToken: string;
  let mariaToken: string;
  let joaoTeamId: string;
  let mariaTeamId: string;
  let joaoAthleteId: string;
  let mariaAthleteId: string;

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

    // Get João's first team
    const joaoTeamsResponse = await server.handle(
      createAuthenticatedRequest("http://localhost/v1/teams", "GET", joaoToken),
    );
    const joaoTeams = await joaoTeamsResponse.json();
    joaoTeamId = joaoTeams[0].id;

    // Get Maria's first team
    const mariaTeamsResponse = await server.handle(
      createAuthenticatedRequest(
        "http://localhost/v1/teams",
        "GET",
        mariaToken,
      ),
    );
    const mariaTeams = await mariaTeamsResponse.json();
    mariaTeamId = mariaTeams[0].id;

    // Get an athlete from João's team
    const joaoAthletesResponse = await server.handle(
      createAuthenticatedRequest(
        `http://localhost/v1/teams/${joaoTeamId}/athletes`,
        "GET",
        joaoToken,
      ),
    );
    const joaoAthletes = await joaoAthletesResponse.json();
    joaoAthleteId = joaoAthletes[0]?.athleteId;

    // Get an athlete from Maria's team
    const mariaAthletesResponse = await server.handle(
      createAuthenticatedRequest(
        `http://localhost/v1/teams/${mariaTeamId}/athletes`,
        "GET",
        mariaToken,
      ),
    );
    const mariaAthletes = await mariaAthletesResponse.json();
    mariaAthleteId = mariaAthletes[0]?.athleteId;
  });

  describe("POST /matches", () => {
    it("should create match without athletes", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/matches",
          "POST",
          joaoToken,
          {
            homeTeamId: joaoTeamId,
            awayTeamId: mariaTeamId,
            timestamp: new Date().toISOString(),
            homeScore: 2,
            awayScore: 1,
          },
        ),
      );

      expect(response.status).toBe(200);
      const match = await response.json();
      expect(match).toHaveProperty("id");
      expect(match.homeScore).toBe(2);
      expect(match.awayScore).toBe(1);
      expect(match.homeTeamId).toBe(joaoTeamId);
      expect(match.awayTeamId).toBe(mariaTeamId);
    });

    it("should create match with athletes and update stats", async () => {
      // Get current stats before match
      const statsBefore = await db.query.athleteCareer.findFirst({
        where: (row, { and, eq }) =>
          and(eq(row.athleteId, joaoAthleteId), eq(row.teamId, joaoTeamId)),
      });

      const response = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/matches",
          "POST",
          joaoToken,
          {
            homeTeamId: joaoTeamId,
            awayTeamId: mariaTeamId,
            timestamp: new Date().toISOString(),
            homeScore: 3,
            awayScore: 2,
            athletes: [
              {
                athleteId: joaoAthleteId,
                teamId: joaoTeamId,
                position: "Atacante",
                goals: 2,
                assists: 1,
                yellowCards: 0,
                redCards: 0,
              },
            ],
          },
        ),
      );

      expect(response.status).toBe(200);
      const match = await response.json();
      expect(match).toHaveProperty("id");

      // Verify stats were updated
      const statsAfter = await db.query.athleteCareer.findFirst({
        where: (row, { and, eq }) =>
          and(eq(row.athleteId, joaoAthleteId), eq(row.teamId, joaoTeamId)),
      });

      expect(statsAfter!.matches).toBe(statsBefore!.matches + 1);
      expect(statsAfter!.goals).toBe(statsBefore!.goals + 2);
      expect(statsAfter!.assists).toBe(statsBefore!.assists + 1);
    });

    it("should reject match where homeTeam equals awayTeam", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/matches",
          "POST",
          joaoToken,
          {
            homeTeamId: joaoTeamId,
            awayTeamId: joaoTeamId, // Same as home
            timestamp: new Date().toISOString(),
            homeScore: 0,
            awayScore: 0,
          },
        ),
      );

      expect(response.status).toBe(422);
    });

    it("should reject if user doesn't own either team", async () => {
      // Pedro doesn't own any team from seed
      const pedroLogin = await login(
        TEST_USERS.pedro.email,
        TEST_USERS.pedro.password,
      );

      const response = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/matches",
          "POST",
          pedroLogin.token!,
          {
            homeTeamId: joaoTeamId,
            awayTeamId: mariaTeamId,
            timestamp: new Date().toISOString(),
            homeScore: 0,
            awayScore: 0,
          },
        ),
      );

      expect(response.status).toBe(403);
    });

    it("should reject if athlete doesn't have active career with team", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/matches",
          "POST",
          joaoToken,
          {
            homeTeamId: joaoTeamId,
            awayTeamId: mariaTeamId,
            timestamp: new Date().toISOString(),
            homeScore: 1,
            awayScore: 0,
            athletes: [
              {
                athleteId: mariaAthleteId,
                teamId: joaoTeamId, // Maria's athlete doesn't play for João's team
                position: "Atacante",
                goals: 1,
                assists: 0,
                yellowCards: 0,
                redCards: 0,
              },
            ],
          },
        ),
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /matches", () => {
    it("should list all matches", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/matches",
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const matches = await response.json();
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]).toHaveProperty("homeTeam");
      expect(matches[0]).toHaveProperty("awayTeam");
    });

    it("should filter matches by team", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/matches?teamId=${joaoTeamId}`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const matches = await response.json();
      expect(Array.isArray(matches)).toBe(true);
      // All matches should have João's team as either home or away
      matches.forEach((match: any) => {
        expect(
          match.homeTeamId === joaoTeamId || match.awayTeamId === joaoTeamId,
        ).toBe(true);
      });
    });

    it("should filter matches by date range", async () => {
      const from = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(); // 30 days ago
      const to = new Date().toISOString();

      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/matches?from=${from}&to=${to}`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const matches = await response.json();
      expect(Array.isArray(matches)).toBe(true);
      // All matches should be within date range
      matches.forEach((match: any) => {
        const matchDate = new Date(match.timestamp);
        expect(matchDate.getTime()).toBeGreaterThanOrEqual(
          new Date(from).getTime(),
        );
        expect(matchDate.getTime()).toBeLessThanOrEqual(new Date(to).getTime());
      });
    });
  });

  describe("GET /matches/:id", () => {
    it("should get match details with athletes", async () => {
      // First create a match with athletes
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/matches",
          "POST",
          joaoToken,
          {
            homeTeamId: joaoTeamId,
            awayTeamId: mariaTeamId,
            timestamp: new Date().toISOString(),
            homeScore: 2,
            awayScore: 0,
            athletes: [
              {
                athleteId: joaoAthleteId,
                teamId: joaoTeamId,
                position: "Atacante",
                goals: 2,
                assists: 0,
                yellowCards: 0,
                redCards: 0,
              },
            ],
          },
        ),
      );

      const created = await createResponse.json();
      const matchId = created.id;

      // Get match details
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/matches/${matchId}`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const match = await response.json();
      expect(match).toHaveProperty("id");
      expect(match).toHaveProperty("homeTeam");
      expect(match).toHaveProperty("awayTeam");
      expect(match).toHaveProperty("athletes");
      expect(Array.isArray(match.athletes)).toBe(true);
      expect(match.athletes.length).toBe(1);
      expect(match.athletes[0].athleteId).toBe(joaoAthleteId);
    });
  });

  describe("PATCH /matches/:id", () => {
    it("should update match scores", async () => {
      // Create a match first
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/matches",
          "POST",
          joaoToken,
          {
            homeTeamId: joaoTeamId,
            awayTeamId: mariaTeamId,
            timestamp: new Date().toISOString(),
            homeScore: 1,
            awayScore: 1,
          },
        ),
      );

      const created = await createResponse.json();
      const matchId = created.id;

      // Update scores
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/matches/${matchId}`,
          "PATCH",
          joaoToken,
          {
            homeScore: 3,
            awayScore: 2,
          },
        ),
      );

      expect(response.status).toBe(200);
      const updated = await response.json();
      expect(updated.homeScore).toBe(3);
      expect(updated.awayScore).toBe(2);
    });

    it("should update match athletes and recalculate stats", async () => {
      // Create a match with one athlete
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/matches",
          "POST",
          joaoToken,
          {
            homeTeamId: joaoTeamId,
            awayTeamId: mariaTeamId,
            timestamp: new Date().toISOString(),
            homeScore: 1,
            awayScore: 0,
            athletes: [
              {
                athleteId: joaoAthleteId,
                teamId: joaoTeamId,
                position: "Atacante",
                goals: 1,
                assists: 0,
                yellowCards: 0,
                redCards: 0,
              },
            ],
          },
        ),
      );

      const created = await createResponse.json();
      const matchId = created.id;

      // Get stats before update
      const statsBefore = await db.query.athleteCareer.findFirst({
        where: (row, { and, eq }) =>
          and(eq(row.athleteId, joaoAthleteId), eq(row.teamId, joaoTeamId)),
      });

      // Update athletes (change goals from 1 to 2)
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/matches/${matchId}`,
          "PATCH",
          joaoToken,
          {
            athletes: [
              {
                athleteId: joaoAthleteId,
                teamId: joaoTeamId,
                position: "Atacante",
                goals: 2, // Changed from 1 to 2
                assists: 1, // Added assist
                yellowCards: 0,
                redCards: 0,
              },
            ],
          },
        ),
      );

      expect(response.status).toBe(200);

      // Verify stats were updated (old stats removed, new stats added)
      const statsAfter = await db.query.athleteCareer.findFirst({
        where: (row, { and, eq }) =>
          and(eq(row.athleteId, joaoAthleteId), eq(row.teamId, joaoTeamId)),
      });

      // Stats should have: -1 goal (removed) +2 goals (added) = +1 goal net
      // Stats should have: +1 assist (added)
      expect(statsAfter!.goals).toBe(statsBefore!.goals + 1);
      expect(statsAfter!.assists).toBe(statsBefore!.assists + 1);
    });

    it("should reject update from non-owner", async () => {
      // Create match with João's token
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          "http://localhost/v1/matches",
          "POST",
          joaoToken,
          {
            homeTeamId: joaoTeamId,
            awayTeamId: mariaTeamId,
            timestamp: new Date().toISOString(),
            homeScore: 0,
            awayScore: 0,
          },
        ),
      );

      const created = await createResponse.json();
      const matchId = created.id;

      // Try to update with Pedro's token (owns no teams)
      const pedroLogin = await login(
        TEST_USERS.pedro.email,
        TEST_USERS.pedro.password,
      );

      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/matches/${matchId}`,
          "PATCH",
          pedroLogin.token!,
          {
            homeScore: 5,
          },
        ),
      );

      expect(response.status).toBe(403);
    });
  });
});
