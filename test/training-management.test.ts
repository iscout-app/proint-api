import { describe, expect, it, beforeAll } from "bun:test";
import { server } from "../src/index";
import { login, createAuthenticatedRequest, TEST_USERS } from "./helpers";

describe("Training Management", () => {
  let joaoToken: string;
  let mariaToken: string;
  let pedroToken: string;
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
    const pedroLogin = await login(
      TEST_USERS.pedro.email,
      TEST_USERS.pedro.password,
    );

    joaoToken = joaoLogin.token!;
    mariaToken = mariaLogin.token!;
    pedroToken = pedroLogin.token!;

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

  describe("POST /teams/:id/trainings", () => {
    it("should create a training", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-01-15",
          },
        ),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id");
      expect(result.data.teamId).toBe(joaoTeamId);
      expect(result.data.concluded).toBe(false);
    });

    it("should reject invalid date format", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "invalid-date",
          },
        ),
      );

      expect(response.status).toBe(422);
    });

    it("should reject if user doesn't own team", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          pedroToken,
          {
            date: "2025-01-15",
          },
        ),
      );

      expect(response.status).toBe(403);
    });
  });

  describe("GET /teams/:id/trainings", () => {
    it("should list all trainings for a team", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const trainings = await response.json();
      expect(Array.isArray(trainings)).toBe(true);
      expect(trainings.length).toBeGreaterThan(0);
    });

    it("should filter trainings by date range", async () => {
      const from = "2025-01-01";
      const to = "2025-01-31";

      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings?from=${from}&to=${to}`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const trainings = await response.json();
      expect(Array.isArray(trainings)).toBe(true);
    });

    it("should filter trainings by concluded status", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings?concluded=false`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const trainings = await response.json();
      expect(Array.isArray(trainings)).toBe(true);
      trainings.forEach((training: any) => {
        expect(training.concluded).toBe(false);
      });
    });

    it("should reject if user doesn't own team", async () => {
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "GET",
          pedroToken,
        ),
      );

      expect(response.status).toBe(403);
    });
  });

  describe("GET /teams/:id/trainings/:trainingId", () => {
    it("should get training details with classes", async () => {
      // Create a training first
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-01-20",
          },
        ),
      );

      const created = await createResponse.json();
      const trainingId = created.data.id;

      // Get training details
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const training = await response.json();
      expect(training).toHaveProperty("id");
      expect(training).toHaveProperty("classes");
      expect(Array.isArray(training.classes)).toBe(true);
    });

    it("should return 404 for non-existent training", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${fakeId}`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(404);
    });

    it("should reject if user doesn't own team", async () => {
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-01-21",
          },
        ),
      );

      const created = await createResponse.json();
      const trainingId = created.data.id;

      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}`,
          "GET",
          pedroToken,
        ),
      );

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /teams/:id/trainings/:trainingId", () => {
    it("should update training date", async () => {
      // Create a training
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-01-22",
          },
        ),
      );

      const created = await createResponse.json();
      const trainingId = created.data.id;

      // Update date
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}`,
          "PATCH",
          joaoToken,
          {
            date: "2025-01-23",
          },
        ),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
    });

    it("should reject if user doesn't own team", async () => {
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-01-24",
          },
        ),
      );

      const created = await createResponse.json();
      const trainingId = created.data.id;

      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}`,
          "PATCH",
          pedroToken,
          {
            date: "2025-01-25",
          },
        ),
      );

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /teams/:id/trainings/:trainingId", () => {
    it("should delete a training", async () => {
      // Create a training
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-01-26",
          },
        ),
      );

      const created = await createResponse.json();
      const trainingId = created.data.id;

      // Delete training
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}`,
          "DELETE",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify it's deleted
      const getResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}`,
          "GET",
          joaoToken,
        ),
      );

      expect(getResponse.status).toBe(404);
    });

    it("should reject if user doesn't own team", async () => {
      const createResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-01-27",
          },
        ),
      );

      const created = await createResponse.json();
      const trainingId = created.data.id;

      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}`,
          "DELETE",
          pedroToken,
        ),
      );

      expect(response.status).toBe(403);
    });
  });

  describe("POST /teams/:id/trainings/:trainingId/classes", () => {
    it("should create a training class", async () => {
      // Create a training first
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-01-28",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      // Create a class
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          joaoToken,
          {
            title: "Treino de Resistência",
            description: "Foco em condicionamento físico",
            notes: "Atenção especial aos atletas em recuperação",
          },
        ),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id");
      expect(result.data.title).toBe("Treino de Resistência");
      expect(result.data.concluded).toBe(false);
    });

    it("should reject title too short", async () => {
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-01-29",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          joaoToken,
          {
            title: "AB", // Too short (min 3)
          },
        ),
      );

      expect(response.status).toBe(422);
    });

    it("should reject if user doesn't own team", async () => {
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-01-30",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          pedroToken,
          {
            title: "Treino Tático",
          },
        ),
      );

      expect(response.status).toBe(403);
    });
  });

  describe("GET /teams/:id/trainings/:trainingId/classes/:classId", () => {
    it("should get training class details with athlete stats", async () => {
      // Create training and class
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-02-01",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      const classResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          joaoToken,
          {
            title: "Treino Técnico",
          },
        ),
      );

      const trainingClass = await classResponse.json();
      const classId = trainingClass.data.id;

      // Get class details
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("athleteStats");
      expect(Array.isArray(result.athleteStats)).toBe(true);
    });

    it("should return 404 for non-existent class", async () => {
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-02-02",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;
      const fakeClassId = "00000000-0000-0000-0000-000000000000";

      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${fakeClassId}`,
          "GET",
          joaoToken,
        ),
      );

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /teams/:id/trainings/:trainingId/classes/:classId", () => {
    it("should update training class", async () => {
      // Create training and class
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-02-03",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      const classResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          joaoToken,
          {
            title: "Treino Inicial",
          },
        ),
      );

      const trainingClass = await classResponse.json();
      const classId = trainingClass.data.id;

      // Update class
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}`,
          "PATCH",
          joaoToken,
          {
            title: "Treino Atualizado",
            concluded: true,
          },
        ),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.title).toBe("Treino Atualizado");
      expect(result.data.concluded).toBe(true);
    });
  });

  describe("DELETE /teams/:id/trainings/:trainingId/classes/:classId", () => {
    it("should delete a training class", async () => {
      // Create training and class
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-02-04",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      const classResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          joaoToken,
          {
            title: "Treino a Deletar",
          },
        ),
      );

      const trainingClass = await classResponse.json();
      const classId = trainingClass.data.id;

      // Delete class
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}`,
          "DELETE",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify it's deleted
      const getResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}`,
          "GET",
          joaoToken,
        ),
      );

      expect(getResponse.status).toBe(404);
    });
  });

  describe("POST /teams/:id/trainings/:trainingId/classes/:classId/athletes", () => {
    it("should add athlete to training class", async () => {
      // Create training and class
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-02-05",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      const classResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          joaoToken,
          {
            title: "Treino com Atletas",
          },
        ),
      );

      const trainingClass = await classResponse.json();
      const classId = trainingClass.data.id;

      // Add athlete
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}/athletes`,
          "POST",
          joaoToken,
          {
            athleteId: joaoAthleteId,
            present: true,
            notes: "Bom desempenho",
            stats: {
              velocidade: 8.5,
              resistencia: 7.0,
            },
          },
        ),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.athleteId).toBe(joaoAthleteId);
      expect(result.data.present).toBe(true);
      expect(result.data.stats).toHaveProperty("velocidade");
    });

    it("should reject athlete not in team", async () => {
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-02-06",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      const classResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          joaoToken,
          {
            title: "Treino Teste",
          },
        ),
      );

      const trainingClass = await classResponse.json();
      const classId = trainingClass.data.id;

      // Try to add Maria's athlete to João's team training
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}/athletes`,
          "POST",
          joaoToken,
          {
            athleteId: mariaAthleteId,
            present: true,
          },
        ),
      );

      expect(response.status).toBe(400);
    });

    it("should reject duplicate athlete in same class", async () => {
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-02-07",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      const classResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          joaoToken,
          {
            title: "Treino Duplicata",
          },
        ),
      );

      const trainingClass = await classResponse.json();
      const classId = trainingClass.data.id;

      // Add athlete first time
      await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}/athletes`,
          "POST",
          joaoToken,
          {
            athleteId: joaoAthleteId,
            present: true,
          },
        ),
      );

      // Try to add same athlete again
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}/athletes`,
          "POST",
          joaoToken,
          {
            athleteId: joaoAthleteId,
            present: false,
          },
        ),
      );

      expect(response.status).toBe(409);
    });
  });

  describe("PATCH /teams/:id/trainings/:trainingId/classes/:classId/athletes/:athleteId", () => {
    it("should update athlete stats", async () => {
      // Create training, class, and add athlete
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-02-08",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      const classResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          joaoToken,
          {
            title: "Treino Update",
          },
        ),
      );

      const trainingClass = await classResponse.json();
      const classId = trainingClass.data.id;

      await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}/athletes`,
          "POST",
          joaoToken,
          {
            athleteId: joaoAthleteId,
            present: true,
            stats: { velocidade: 7.0 },
          },
        ),
      );

      // Update athlete stats
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}/athletes/${joaoAthleteId}`,
          "PATCH",
          joaoToken,
          {
            present: false,
            notes: "Machucado",
            stats: { velocidade: 0, motivo: "lesão" },
          },
        ),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.present).toBe(false);
      expect(result.data.notes).toBe("Machucado");
    });
  });

  describe("DELETE /teams/:id/trainings/:trainingId/classes/:classId/athletes/:athleteId", () => {
    it("should remove athlete from training class", async () => {
      // Create training, class, and add athlete
      const trainingResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings`,
          "POST",
          joaoToken,
          {
            date: "2025-02-09",
          },
        ),
      );

      const training = await trainingResponse.json();
      const trainingId = training.data.id;

      const classResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes`,
          "POST",
          joaoToken,
          {
            title: "Treino Remover",
          },
        ),
      );

      const trainingClass = await classResponse.json();
      const classId = trainingClass.data.id;

      await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}/athletes`,
          "POST",
          joaoToken,
          {
            athleteId: joaoAthleteId,
            present: true,
          },
        ),
      );

      // Remove athlete
      const response = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}/athletes/${joaoAthleteId}`,
          "DELETE",
          joaoToken,
        ),
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify athlete is removed
      const getClassResponse = await server.handle(
        createAuthenticatedRequest(
          `http://localhost/v1/teams/${joaoTeamId}/trainings/${trainingId}/classes/${classId}`,
          "GET",
          joaoToken,
        ),
      );

      const classData = await getClassResponse.json();
      expect(classData.athleteStats.length).toBe(0);
    });
  });
});
