import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/db/schema";

const db = drizzle(Bun.env.DATABASE_URL!, { schema });

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Clear existing data (reverse order of dependencies)
  console.log("🗑️  Clearing existing data...");
  await db.delete(schema.matchAthletes);
  await db.delete(schema.matches);
  await db.delete(schema.athleteCareer);
  await db.delete(schema.athletes);
  await db.delete(schema.teams);
  await db.delete(schema.users);

  // 2. Create users (5)
  console.log("👤 Creating users...");
  const password = await Bun.password.hash("password123");

  const users = await db
    .insert(schema.users)
    .values([
      {
        name: "João Silva",
        email: "joao@example.com",
        password,
      },
      {
        name: "Maria Santos",
        email: "maria@example.com",
        password,
      },
      {
        name: "Pedro Costa",
        email: "pedro@example.com",
        password,
      },
      {
        name: "Ana Oliveira",
        email: "ana@example.com",
        password,
      },
      {
        name: "Carlos Souza",
        email: "carlos@example.com",
        password,
      },
    ])
    .returning();

  console.log(`✅ Created ${users.length} users`);

  // 3. Create teams (8, distributed among users)
  console.log("⚽ Creating teams...");
  const teams = await db
    .insert(schema.teams)
    .values([
      {
        fullName: "Flamengo FC",
        shortName: "FLA",
        mainColorHex: "FF0000",
        secondaryColorHex: "000000",
        createdBy: users[0].id,
      },
      {
        fullName: "Palmeiras SC",
        shortName: "PAL",
        mainColorHex: "006633",
        secondaryColorHex: "FFFFFF",
        createdBy: users[0].id,
      },
      {
        fullName: "São Paulo FC",
        shortName: "SAO",
        mainColorHex: "FF0000",
        secondaryColorHex: "FFFFFF",
        createdBy: users[1].id,
      },
      {
        fullName: "Corinthians",
        shortName: "COR",
        mainColorHex: "000000",
        secondaryColorHex: "FFFFFF",
        createdBy: users[1].id,
      },
      {
        fullName: "Santos FC",
        shortName: "SAN",
        mainColorHex: "FFFFFF",
        secondaryColorHex: "000000",
        createdBy: users[2].id,
      },
      {
        fullName: "Grêmio FBPA",
        shortName: "GRE",
        mainColorHex: "0066CC",
        secondaryColorHex: "000000",
        createdBy: users[3].id,
      },
      {
        fullName: "Internacional",
        shortName: "INT",
        mainColorHex: "FF0000",
        secondaryColorHex: "FFFFFF",
        createdBy: users[3].id,
      },
      {
        fullName: "Atlético MG",
        shortName: "ATM",
        mainColorHex: "000000",
        secondaryColorHex: "FFFFFF",
        createdBy: users[4].id,
      },
    ])
    .returning();

  console.log(`✅ Created ${teams.length} teams`);

  // 4. Create athletes (28)
  console.log("🏃 Creating athletes...");
  const athleteNames = [
    "Gabriel Silva",
    "Lucas Oliveira",
    "Rafael Santos",
    "Mateus Costa",
    "Felipe Alves",
    "Bruno Lima",
    "Diego Souza",
    "Thiago Pereira",
    "Rodrigo Martins",
    "João Paulo",
    "Pedro Henrique",
    "Vinicius Jr",
    "Neymar Santos",
    "Marcelo Vieira",
    "Daniel Alves",
    "Casemiro Silva",
    "Fabinho Tavares",
    "Richarlison Andrade",
    "Roberto Firmino",
    "Alisson Becker",
    "Ederson Moraes",
    "Marquinhos Correia",
    "Thiago Silva",
    "Alex Sandro",
    "Danilo Pereira",
    "Arthur Melo",
    "Fred Rodrigues",
    "Everton Cebolinha",
  ];

  const athletes = await db
    .insert(schema.athletes)
    .values(
      athleteNames.map((name) => ({
        name,
        birthdate: new Date(
          1995 + Math.floor(Math.random() * 8),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        )
          .toISOString()
          .split("T")[0],
      })),
    )
    .returning();

  console.log(`✅ Created ${athletes.length} athletes`);

  // 5. Create athlete careers (link athletes to teams)
  console.log("📊 Creating athlete careers...");
  const positions = [
    "Goleiro",
    "Zagueiro",
    "Lateral",
    "Volante",
    "Meia",
    "Atacante",
  ];
  const careerData = [];

  // Distribute athletes among teams (3-4 per team)
  let athleteIndex = 0;
  for (const team of teams) {
    const athletesPerTeam = 3 + Math.floor(Math.random() * 2); // 3 or 4
    for (
      let i = 0;
      i < athletesPerTeam && athleteIndex < athletes.length;
      i++
    ) {
      careerData.push({
        athleteId: athletes[athleteIndex].id,
        teamId: team.id,
        shirtNumber: i + 1,
        position: positions[Math.floor(Math.random() * positions.length)],
        startedAt: new Date(2024, 0, 1).toISOString().split("T")[0],
      });
      athleteIndex++;
    }
  }

  await db.insert(schema.athleteCareer).values(careerData);
  console.log(`✅ Created ${careerData.length} athlete careers`);

  // 6. Create matches (14)
  console.log("⚔️  Creating matches...");
  const matchesData = [];
  const now = new Date();

  // Create matches over the last 3 months
  for (let i = 0; i < 14; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const matchDate = new Date(now);
    matchDate.setDate(matchDate.getDate() - daysAgo);

    // Pick random home and away teams
    const homeTeam = teams[Math.floor(Math.random() * teams.length)];
    let awayTeam = teams[Math.floor(Math.random() * teams.length)];

    // Ensure home and away are different
    while (awayTeam.id === homeTeam.id) {
      awayTeam = teams[Math.floor(Math.random() * teams.length)];
    }

    const homeScore = Math.floor(Math.random() * 4);
    const awayScore = Math.floor(Math.random() * 4);

    matchesData.push({
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      timestamp: matchDate,
      homeScore,
      awayScore,
    });
  }

  const matches = await db
    .insert(schema.matches)
    .values(matchesData)
    .returning();

  console.log(`✅ Created ${matches.length} matches`);

  // 7. Create match athletes performances
  console.log("📈 Creating match athlete performances...");
  const matchAthletesData = [];

  for (const match of matches) {
    // Get athletes from both teams
    const homeTeamAthletes = careerData.filter(
      (c) => c.teamId === match.homeTeamId,
    );
    const awayTeamAthletes = careerData.filter(
      (c) => c.teamId === match.awayTeamId,
    );

    // Add 2-3 athletes per team to the match
    const numHomeAthletes = 2 + Math.floor(Math.random() * 2);
    const numAwayAthletes = 2 + Math.floor(Math.random() * 2);

    for (
      let i = 0;
      i < Math.min(numHomeAthletes, homeTeamAthletes.length);
      i++
    ) {
      const career = homeTeamAthletes[i];
      matchAthletesData.push({
        matchId: match.id,
        athleteId: career.athleteId,
        teamId: career.teamId,
        position: career.position,
        goals: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
        assists: Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0,
        yellowCards: Math.random() > 0.8 ? 1 : 0,
        redCards: Math.random() > 0.95 ? 1 : 0,
      });
    }

    for (
      let i = 0;
      i < Math.min(numAwayAthletes, awayTeamAthletes.length);
      i++
    ) {
      const career = awayTeamAthletes[i];
      matchAthletesData.push({
        matchId: match.id,
        athleteId: career.athleteId,
        teamId: career.teamId,
        position: career.position,
        goals: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
        assists: Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0,
        yellowCards: Math.random() > 0.8 ? 1 : 0,
        redCards: Math.random() > 0.95 ? 1 : 0,
      });
    }
  }

  await db.insert(schema.matchAthletes).values(matchAthletesData);
  console.log(
    `✅ Created ${matchAthletesData.length} match athlete performances`,
  );

  // 8. Update athleteCareer stats based on match performances
  console.log("🔄 Updating athlete career stats...");
  const statsMap = new Map<
    string,
    {
      matches: number;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
    }
  >();

  for (const perf of matchAthletesData) {
    const key = `${perf.athleteId}::${perf.teamId}`;
    const existing = statsMap.get(key);

    if (existing) {
      existing.matches += 1;
      existing.goals += perf.goals;
      existing.assists += perf.assists;
      existing.yellowCards += perf.yellowCards;
      existing.redCards += perf.redCards;
    } else {
      statsMap.set(key, {
        matches: 1,
        goals: perf.goals,
        assists: perf.assists,
        yellowCards: perf.yellowCards,
        redCards: perf.redCards,
      });
    }
  }

  for (const [key, stats] of statsMap.entries()) {
    const [athleteId, teamId] = key.split("::");
    await db
      .update(schema.athleteCareer)
      .set(stats)
      .where(
        and(
          eq(schema.athleteCareer.athleteId, athleteId),
          eq(schema.athleteCareer.teamId, teamId),
        ),
      );
  }

  console.log("✅ Updated athlete career stats");
  console.log("\n✨ Seed completed successfully!");
  console.log("\n📝 Test credentials:");
  console.log("   Email: joao@example.com");
  console.log("   Password: password123");
  console.log("\n   (All users have the same password)");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
