import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  users,
  teams,
  athletes,
  athleteCareer,
  matches,
  matchAthletes,
} from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function seed() {
  console.log("🌱 Starting seed...");

  try {
    // Criar usuários
    console.log("Creating users...");
    const [admin, tecnico, olheiro, responsavel] = await db
      .insert(users)
      .values([
        {
          name: "Admin User",
          email: "admin@iscout.com",
          password: await Bun.password.hash("admin123"),
          role: "admin",
        },
        {
          name: "Técnico Silva",
          email: "tecnico@iscout.com",
          password: await Bun.password.hash("tecnico123"),
          role: "tecnico",
        },
        {
          name: "Olheiro Santos",
          email: "olheiro@iscout.com",
          password: await Bun.password.hash("olheiro123"),
          role: "olheiro",
        },
        {
          name: "Responsável Oliveira",
          email: "responsavel@iscout.com",
          password: await Bun.password.hash("responsavel123"),
          role: "responsavel",
        },
      ])
      .returning();

    console.log(`✓ Created ${4} users`);

    // Criar times
    console.log("Creating teams...");
    const [teamA, teamB] = await db
      .insert(teams)
      .values([
        {
          fullName: "Força Jovem FC",
          shortName: "FJFC",
          mainColorHex: "0066CC",
          secondaryColorHex: "FFFFFF",
          createdBy: tecnico.id,
        },
        {
          fullName: "Academia Esportiva",
          shortName: "ACES",
          mainColorHex: "FF0000",
          secondaryColorHex: "000000",
          createdBy: tecnico.id,
        },
      ])
      .returning();

    console.log(`✓ Created ${2} teams`);

    // Criar atletas
    console.log("Creating athletes...");
    const athletesData = await db
      .insert(athletes)
      .values([
        { name: "Gabriel Silva", birthdate: "2008-03-15" },
        { name: "Lucas Santos", birthdate: "2007-08-22" },
        { name: "Pedro Costa", birthdate: "2008-11-10" },
        { name: "Rafael Lima", birthdate: "2007-05-18" },
        { name: "Matheus Oliveira", birthdate: "2008-01-25" },
        { name: "Felipe Rodrigues", birthdate: "2007-09-30" },
        { name: "Bruno Alves", birthdate: "2008-06-12" },
        { name: "João Pereira", birthdate: "2007-12-05" },
      ])
      .returning();

    console.log(`✓ Created ${athletesData.length} athletes`);

    // Criar carreira dos atletas (vincular aos times)
    console.log("Creating athlete careers...");
    await db.insert(athleteCareer).values([
      // Time A (Força Jovem FC)
      {
        athleteId: athletesData[0].id,
        teamId: teamA.id,
        shirtNumber: 10,
        position: "Meia-Atacante",
        matches: 5,
        goals: 8,
        assists: 4,
        yellowCards: 1,
        redCards: 0,
      },
      {
        athleteId: athletesData[1].id,
        teamId: teamA.id,
        shirtNumber: 9,
        position: "Centroavante",
        matches: 5,
        goals: 12,
        assists: 2,
        yellowCards: 0,
        redCards: 0,
      },
      {
        athleteId: athletesData[2].id,
        teamId: teamA.id,
        shirtNumber: 7,
        position: "Ponta-Direita",
        matches: 4,
        goals: 3,
        assists: 6,
        yellowCards: 2,
        redCards: 0,
      },
      {
        athleteId: athletesData[3].id,
        teamId: teamA.id,
        shirtNumber: 5,
        position: "Volante",
        matches: 5,
        goals: 1,
        assists: 3,
        yellowCards: 3,
        redCards: 0,
      },
      {
        athleteId: athletesData[4].id,
        teamId: teamA.id,
        shirtNumber: 1,
        position: "Goleiro",
        matches: 5,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      },
      // Time B (Academia Esportiva)
      {
        athleteId: athletesData[5].id,
        teamId: teamB.id,
        shirtNumber: 11,
        position: "Ponta-Esquerda",
        matches: 3,
        goals: 5,
        assists: 3,
        yellowCards: 1,
        redCards: 0,
      },
      {
        athleteId: athletesData[6].id,
        teamId: teamB.id,
        shirtNumber: 3,
        position: "Zagueiro",
        matches: 3,
        goals: 1,
        assists: 0,
        yellowCards: 2,
        redCards: 1,
      },
      {
        athleteId: athletesData[7].id,
        teamId: teamB.id,
        shirtNumber: 8,
        position: "Meia",
        matches: 3,
        goals: 2,
        assists: 5,
        yellowCards: 1,
        redCards: 0,
      },
    ]);

    console.log(`✓ Created athlete career records`);

    // Criar partidas
    console.log("Creating matches...");
    const matchesData = await db
      .insert(matches)
      .values([
        {
          timestamp: new Date("2024-11-20T15:00:00"),
          homeTeamId: teamA.id,
          awayTeamId: teamB.id,
          homeScore: 3,
          awayScore: 2,
        },
        {
          timestamp: new Date("2024-11-15T10:00:00"),
          homeTeamId: teamB.id,
          awayTeamId: teamA.id,
          homeScore: 1,
          awayScore: 4,
        },
        {
          timestamp: new Date("2024-11-10T14:00:00"),
          homeTeamId: teamA.id,
          awayTeamId: teamB.id,
          homeScore: 2,
          awayScore: 1,
        },
      ])
      .returning();

    console.log(`✓ Created ${matchesData.length} matches`);

    // Criar estatísticas dos atletas nas partidas
    console.log("Creating match athlete stats...");
    await db.insert(matchAthletes).values([
      // Partida 1 - Time A casa (3x2)
      {
        athleteId: athletesData[0].id,
        matchId: matchesData[0].id,
        teamId: teamA.id,
        position: "Meia-Atacante",
        goals: 2,
        assists: 1,
        yellowCards: 0,
        redCards: 0,
      },
      {
        athleteId: athletesData[1].id,
        matchId: matchesData[0].id,
        teamId: teamA.id,
        position: "Centroavante",
        goals: 1,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      },
      {
        athleteId: athletesData[5].id,
        matchId: matchesData[0].id,
        teamId: teamB.id,
        position: "Ponta-Esquerda",
        goals: 2,
        assists: 0,
        yellowCards: 1,
        redCards: 0,
      },
      // Partida 2 - Time B casa (1x4)
      {
        athleteId: athletesData[1].id,
        matchId: matchesData[1].id,
        teamId: teamA.id,
        position: "Centroavante",
        goals: 3,
        assists: 1,
        yellowCards: 0,
        redCards: 0,
      },
      {
        athleteId: athletesData[2].id,
        matchId: matchesData[1].id,
        teamId: teamA.id,
        position: "Ponta-Direita",
        goals: 1,
        assists: 2,
        yellowCards: 1,
        redCards: 0,
      },
      {
        athleteId: athletesData[5].id,
        matchId: matchesData[1].id,
        teamId: teamB.id,
        position: "Ponta-Esquerda",
        goals: 1,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      },
      // Partida 3 - Time A casa (2x1)
      {
        athleteId: athletesData[0].id,
        matchId: matchesData[2].id,
        teamId: teamA.id,
        position: "Meia-Atacante",
        goals: 1,
        assists: 1,
        yellowCards: 0,
        redCards: 0,
      },
      {
        athleteId: athletesData[3].id,
        matchId: matchesData[2].id,
        teamId: teamA.id,
        position: "Volante",
        goals: 1,
        assists: 0,
        yellowCards: 2,
        redCards: 0,
      },
      {
        athleteId: athletesData[6].id,
        matchId: matchesData[2].id,
        teamId: teamB.id,
        position: "Zagueiro",
        goals: 1,
        assists: 0,
        yellowCards: 1,
        redCards: 1,
      },
    ]);

    console.log(`✓ Created match athlete statistics`);

    console.log("\n✅ Seed completed successfully!");
    console.log("\nTest credentials:");
    console.log("Admin: admin@iscout.com / admin123");
    console.log("Técnico: tecnico@iscout.com / tecnico123");
    console.log("Olheiro: olheiro@iscout.com / olheiro123");
    console.log("Responsável: responsavel@iscout.com / responsavel123");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
