import { Athlete as AthleteSubmodule } from "../team/submodules/athlete/service";

abstract class Athlete {
  /**
   * Delegates to the detailed fetch method in the athlete submodule
   */
  static async fetch(athleteId: string, limit: number, offset: number) {
    return AthleteSubmodule.fetchDetailed(athleteId, limit, offset);
  }
}

export { Athlete };
