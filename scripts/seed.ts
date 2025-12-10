import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/db/schema";

const db = drizzle(Bun.env.DATABASE_URL!, { schema });

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Clear existing data (reverse order of dependencies)
  console.log("🗑️  Clearing existing data...");
  await db.delete(schema.athleteTrainingClassStats);
  await db.delete(schema.trainingClasses);
  await db.delete(schema.trainings);
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

  // 3. Create teams (10 teams)
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
        createdBy: users[2].id,
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
        createdBy: users[3].id,
      },
      {
        fullName: "Cruzeiro EC",
        shortName: "CRU",
        mainColorHex: "0033CC",
        secondaryColorHex: "FFFFFF",
        createdBy: users[4].id,
      },
      {
        fullName: "Botafogo FR",
        shortName: "BOT",
        mainColorHex: "000000",
        secondaryColorHex: "FFFFFF",
        createdBy: users[4].id,
      },
    ])
    .returning();

  console.log(`✅ Created ${teams.length} teams`);

  // 4. Create athletes (50 athletes for more data)
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
    "Antony Matheus",
    "Raphinha Dias",
    "Matheus Cunha",
    "Gabriel Jesus",
    "Vinícius Tobias",
    "Brenner Silva",
    "Yuri Alberto",
    "Pedro Raul",
    "Rony Rustico",
    "Dudu Alves",
    "Gustavo Scarpa",
    "Raphael Veiga",
    "Gabriel Menino",
    "Patrick de Paula",
    "Wesley Moraes",
    "Igor Gomes",
    "Gabriel Sara",
    "Reinaldo Manoel",
    "Rodrigo Nestor",
    "Calleri Jonathan",
    "Luciano Neves",
    "Miranda Felipe",
  ];

  const athletes = await db
    .insert(schema.athletes)
    .values(
      athleteNames.map((name, index) => ({
        name,
        // Diferentes faixas etárias (SUB-13 até SUB-20)
        birthdate: new Date(
          2003 + Math.floor(index / 7), // Distribui entre 2003-2011
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        )
          .toISOString()
          .split("T")[0],
      })),
    )
    .returning();

  console.log(`✅ Created ${athletes.length} athletes`);

  // 5. Create athlete careers (5 athletes per team)
  console.log("📊 Creating athlete careers...");
  const positions = [
    "Goleiro",
    "Zagueiro",
    "Lateral Direito",
    "Lateral Esquerdo",
    "Volante",
    "Meia",
    "Meia Atacante",
    "Ponta Direita",
    "Ponta Esquerda",
    "Centroavante",
  ];
  const careerData = [];

  // Distribute athletes among teams (5 per team)
  let athleteIndex = 0;
  for (const team of teams) {
    const athletesPerTeam = 5;
    for (
      let i = 0;
      i < athletesPerTeam && athleteIndex < athletes.length;
      i++
    ) {
      careerData.push({
        athleteId: athletes[athleteIndex].id,
        teamId: team.id,
        shirtNumber: (i + 1) * 2, // 2, 4, 6, 8, 10
        position: positions[i % positions.length],
        startedAt: new Date(2024, 0, 1).toISOString().split("T")[0],
      });
      athleteIndex++;
    }
  }

  await db.insert(schema.athleteCareer).values(careerData);
  console.log(`✅ Created ${careerData.length} athlete careers`);

  // 6. Create matches (50 matches over last 6 months)
  console.log("⚔️  Creating matches...");
  const matchesData = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 180); // Last 6 months
    const matchDate = new Date(now);
    matchDate.setDate(matchDate.getDate() - daysAgo);

    // Pick random home and away teams
    const homeTeam = teams[Math.floor(Math.random() * teams.length)];
    let awayTeam = teams[Math.floor(Math.random() * teams.length)];

    // Ensure home and away are different
    while (awayTeam.id === homeTeam.id) {
      awayTeam = teams[Math.floor(Math.random() * teams.length)];
    }

    const homeScore = Math.floor(Math.random() * 5);
    const awayScore = Math.floor(Math.random() * 5);

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

  // 7. Create match athletes performances (more detailed)
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

    // Add 3-5 athletes per team to the match
    const numHomeAthletes = 3 + Math.floor(Math.random() * 3);
    const numAwayAthletes = 3 + Math.floor(Math.random() * 3);

    for (
      let i = 0;
      i < Math.min(numHomeAthletes, homeTeamAthletes.length);
      i++
    ) {
      const career = homeTeamAthletes[i];
      const goals = Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0;
      const assists = Math.random() > 0.6 ? Math.floor(Math.random() * 2) : 0;

      matchAthletesData.push({
        matchId: match.id,
        athleteId: career.athleteId,
        teamId: career.teamId,
        position: career.position,
        goals,
        assists,
        yellowCards: Math.random() > 0.85 ? 1 : 0,
        redCards: Math.random() > 0.97 ? 1 : 0,
      });
    }

    for (
      let i = 0;
      i < Math.min(numAwayAthletes, awayTeamAthletes.length);
      i++
    ) {
      const career = awayTeamAthletes[i];
      const goals = Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0;
      const assists = Math.random() > 0.6 ? Math.floor(Math.random() * 2) : 0;

      matchAthletesData.push({
        matchId: match.id,
        athleteId: career.athleteId,
        teamId: career.teamId,
        position: career.position,
        goals,
        assists,
        yellowCards: Math.random() > 0.85 ? 1 : 0,
        redCards: Math.random() > 0.97 ? 1 : 0,
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

  // 9. Create trainings (30 trainings over last 3 months)
  console.log("🏋️  Creating trainings...");
  const trainingsData = [];

  for (const team of teams) {
    // Create 3 trainings per team
    for (let i = 0; i < 3; i++) {
      const daysAgo = Math.floor(Math.random() * 90); // Last 3 months
      const trainingDate = new Date(now);
      trainingDate.setDate(trainingDate.getDate() - daysAgo);

      trainingsData.push({
        teamId: team.id,
        date: trainingDate.toISOString().split("T")[0],
        concluded: Math.random() > 0.2, // 80% concluded
        concludedAt: Math.random() > 0.2 ? trainingDate : undefined,
      });
    }
  }

  const trainings = await db
    .insert(schema.trainings)
    .values(trainingsData)
    .returning();

  console.log(`✅ Created ${trainings.length} trainings`);

  // 10. Create training classes (3-4 classes per training)
  console.log("📚 Creating training classes...");
  const trainingClassesData = [];
  const classTitles = [
    "Treino Tático Ofensivo",
    "Treino Tático Defensivo",
    "Treino Físico - Resistência",
    "Treino Físico - Velocidade",
    "Treino Técnico - Controle de Bola",
    "Treino Técnico - Passes",
    "Treino de Finalizações",
    "Treino de Cruzamentos",
    "Treino de Bola Parada",
    "Treino de Marcação",
    "Treino de Transição",
    "Treino Recreativo",
  ];

  for (const training of trainings) {
    const numClasses = 3 + Math.floor(Math.random() * 2); // 3-4 classes
    for (let i = 0; i < numClasses; i++) {
      trainingClassesData.push({
        trainingId: training.id,
        title: classTitles[Math.floor(Math.random() * classTitles.length)],
        description:
          Math.random() > 0.3
            ? "Foco em aspectos técnicos e táticos do jogo, trabalhando situações específicas de partida."
            : undefined,
        notes:
          Math.random() > 0.6
            ? "Atletas mostraram bom envolvimento e dedicação durante o treino."
            : undefined,
        concluded: training.concluded,
        concludedAt: training.concludedAt,
      });
    }
  }

  const trainingClasses = await db
    .insert(schema.trainingClasses)
    .values(trainingClassesData)
    .returning();

  console.log(`✅ Created ${trainingClasses.length} training classes`);

  // 11. Add athletes to training classes (more participants)
  console.log("👥 Adding athletes to training classes...");
  const athleteStatsData = [];

  for (const trainingClass of trainingClasses) {
    // Get the training to find the team
    const training = trainings.find((t) => t.id === trainingClass.trainingId);
    if (!training) continue;

    // Get athletes from this team
    const teamAthletes = careerData.filter((c) => c.teamId === training.teamId);

    // Add 3-5 athletes to this class (more realistic)
    const numAthletes = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < Math.min(numAthletes, teamAthletes.length); i++) {
      const career = teamAthletes[i];
      const present = Math.random() > 0.15; // 85% attendance rate

      athleteStatsData.push({
        trainingClassId: trainingClass.id,
        athleteId: career.athleteId,
        present,
        notes: present
          ? Math.random() > 0.6
            ? [
                "Excelente desempenho no treino",
                "Bom empenho, continuar assim",
                "Precisa melhorar posicionamento",
                "Destaque do treino",
                "Mostrou evolução técnica",
              ][Math.floor(Math.random() * 5)]
            : undefined
          : "Faltou ao treino",
        stats: present
          ? {
              velocidade: Math.round((Math.random() * 3 + 6) * 10) / 10, // 6.0-9.0
              resistencia: Math.round((Math.random() * 3 + 6) * 10) / 10,
              tecnica: Math.round((Math.random() * 3 + 6) * 10) / 10,
              precisao: Math.round((Math.random() * 3 + 6) * 10) / 10,
              concentracao: Math.round((Math.random() * 3 + 6) * 10) / 10,
            }
          : null,
      });
    }
  }

  await db.insert(schema.athleteTrainingClassStats).values(athleteStatsData);
  console.log(
    `✅ Created ${athleteStatsData.length} athlete training class stats`,
  );

  console.log("\n✨ Seed completed successfully!");
  console.log("\n📊 Database Statistics:");
  console.log(`   👤 Users: ${users.length}`);
  console.log(`   ⚽ Teams: ${teams.length}`);
  console.log(`   🏃 Athletes: ${athletes.length}`);
  console.log(`   📊 Careers: ${careerData.length}`);
  console.log(`   ⚔️  Matches: ${matches.length}`);
  console.log(`   📈 Match Performances: ${matchAthletesData.length}`);
  console.log(`   🏋️  Trainings: ${trainings.length}`);
  console.log(`   📚 Training Classes: ${trainingClasses.length}`);
  console.log(`   👥 Training Participations: ${athleteStatsData.length}`);
  console.log("\n📝 Test credentials:");
  console.log("   Email: joao@example.com");
  console.log("   Password: password123");
  console.log("\n   (All users have the same password)");
  console.log("\n🎯 Teams distribution:");
  console.log("   João Silva: Flamengo FC, Palmeiras SC");
  console.log("   Maria Santos: São Paulo FC, Corinthians");
  console.log("   Pedro Costa: Santos FC, Grêmio FBPA");
  console.log("   Ana Oliveira: Internacional, Atlético MG");
  console.log("   Carlos Souza: Cruzeiro EC, Botafogo FR");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
