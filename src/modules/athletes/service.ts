import { db } from "../..";
import { athletes, athleteCareer, teams } from "../../db/schema";
import { eq, sql, and } from "drizzle-orm";
import { status } from "elysia";

abstract class Athletes {
  static async getAll(teamId?: string) {
    // Sempre faz join com athleteCareer para ter dados completos
    let query = db
      .select({
        id: athletes.id,
        name: athletes.name,
        birthdate: athletes.birthdate,
        position: athleteCareer.position,
        shirtNumber: athleteCareer.shirtNumber,
        matches: athleteCareer.matches,
        goals: athleteCareer.goals,
        assists: athleteCareer.assists,
        yellowCards: athleteCareer.yellowCards,
        redCards: athleteCareer.redCards,
        teamId: athleteCareer.teamId,
      })
      .from(athletes)
      .innerJoin(athleteCareer, eq(athletes.id, athleteCareer.athleteId));

    // Se teamId for fornecido, filtra por ele
    if (teamId) {
      query = query.where(eq(athleteCareer.teamId, teamId)) as any;
    }

    const results = await query;

    return results.map((athlete) => ({
      id: athlete.id,
      name: athlete.name,
      birthdate: athlete.birthdate,
      position: athlete.position,
      shirtNumber: athlete.shirtNumber,
      stats: {
        matches: Number(athlete.matches),
        goals: Number(athlete.goals),
        assists: Number(athlete.assists),
        yellowCards: Number(athlete.yellowCards),
        redCards: Number(athlete.redCards),
      },
      teamId: athlete.teamId,
    }));
  }

  static async getById(id: string, teamId?: string) {
    // Sempre faz join com athleteCareer para ter dados completos
    let query = db
      .select({
        id: athletes.id,
        name: athletes.name,
        birthdate: athletes.birthdate,
        position: athleteCareer.position,
        shirtNumber: athleteCareer.shirtNumber,
        matches: athleteCareer.matches,
        goals: athleteCareer.goals,
        assists: athleteCareer.assists,
        yellowCards: athleteCareer.yellowCards,
        redCards: athleteCareer.redCards,
        teamId: athleteCareer.teamId,
      })
      .from(athletes)
      .innerJoin(athleteCareer, eq(athletes.id, athleteCareer.athleteId));

    // Filtra por ID do atleta e opcionalmente por teamId
    if (teamId) {
      query = query.where(
        and(eq(athletes.id, id), eq(athleteCareer.teamId, teamId)),
      ) as any;
    } else {
      query = query.where(eq(athletes.id, id)) as any;
    }

    let results = await query;

    // Se não encontrou com o teamId específico, busca sem filtro de team (pega o primeiro)
    if (results.length === 0 && teamId) {
      results = await db
        .select({
          id: athletes.id,
          name: athletes.name,
          birthdate: athletes.birthdate,
          position: athleteCareer.position,
          shirtNumber: athleteCareer.shirtNumber,
          matches: athleteCareer.matches,
          goals: athleteCareer.goals,
          assists: athleteCareer.assists,
          yellowCards: athleteCareer.yellowCards,
          redCards: athleteCareer.redCards,
          teamId: athleteCareer.teamId,
        })
        .from(athletes)
        .innerJoin(athleteCareer, eq(athletes.id, athleteCareer.athleteId))
        .where(eq(athletes.id, id))
        .limit(1);
    }

    if (results.length === 0) {
      return null;
    }

    const athlete = results[0];

    return {
      id: athlete.id,
      name: athlete.name,
      birthdate: athlete.birthdate,
      position: athlete.position,
      shirtNumber: athlete.shirtNumber,
      stats: {
        matches: Number(athlete.matches),
        goals: Number(athlete.goals),
        assists: Number(athlete.assists),
        yellowCards: Number(athlete.yellowCards),
        redCards: Number(athlete.redCards),
      },
      teamId: athlete.teamId,
    };
  }

  static async create(data: {
    name: string;
    birthdate: string;
    teamId: string;
    position: string;
    shirtNumber: number;
  }) {
    // Verificar se o time existe
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, data.teamId),
    });

    if (!team) {
      throw status(404, "Time não encontrado");
    }

    // Criar o atleta
    const [newAthlete] = await db
      .insert(athletes)
      .values({
        name: data.name,
        birthdate: data.birthdate,
      })
      .returning();

    // Criar o vínculo com o time (athleteCareer)
    await db.insert(athleteCareer).values({
      athleteId: newAthlete.id,
      teamId: data.teamId,
      position: data.position,
      shirtNumber: data.shirtNumber,
    });

    return {
      id: newAthlete.id,
      name: newAthlete.name,
      birthdate: newAthlete.birthdate,
      position: data.position,
      shirtNumber: data.shirtNumber,
      stats: {
        matches: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      },
      teamId: data.teamId,
    };
  }

  static async update(
    id: string,
    teamId: string,
    data: {
      name?: string;
      birthdate?: string;
      position?: string;
      shirtNumber?: number;
    },
  ) {
    // Verificar se o atleta existe
    const athlete = await db.query.athletes.findFirst({
      where: eq(athletes.id, id),
    });

    if (!athlete) {
      throw status(404, "Atleta não encontrado");
    }

    // Atualizar dados do atleta se fornecidos
    if (data.name || data.birthdate) {
      await db
        .update(athletes)
        .set({
          ...(data.name && { name: data.name }),
          ...(data.birthdate && { birthdate: data.birthdate }),
        })
        .where(eq(athletes.id, id));
    }

    // Atualizar dados da carreira se fornecidos
    if (data.position || data.shirtNumber) {
      await db
        .update(athleteCareer)
        .set({
          ...(data.position && { position: data.position }),
          ...(data.shirtNumber && { shirtNumber: data.shirtNumber }),
        })
        .where(
          and(
            eq(athleteCareer.athleteId, id),
            eq(athleteCareer.teamId, teamId),
          ),
        );
    }

    // Buscar o atleta atualizado
    return await this.getById(id, teamId);
  }

  static async delete(id: string, teamId: string) {
    // Verificar se o atleta existe
    const athlete = await db.query.athletes.findFirst({
      where: eq(athletes.id, id),
    });

    if (!athlete) {
      throw status(404, "Atleta não encontrado");
    }

    // Primeiro, deletar o vínculo com o time (athleteCareer)
    await db
      .delete(athleteCareer)
      .where(
        and(eq(athleteCareer.athleteId, id), eq(athleteCareer.teamId, teamId)),
      );

    // Verificar se o atleta tem outros vínculos
    const remainingCareer = await db.query.athleteCareer.findFirst({
      where: eq(athleteCareer.athleteId, id),
    });

    // Se não tiver outros vínculos, deletar o atleta
    if (!remainingCareer) {
      await db.delete(athletes).where(eq(athletes.id, id));
    }

    return { success: true };
  }
}

export { Athletes };
