CREATE TABLE "athlete_career" (
	"athleteId" uuid NOT NULL,
	"teamId" uuid NOT NULL,
	"shirtNumber" integer NOT NULL,
	"position" varchar(32) NOT NULL,
	"matches" integer DEFAULT 0 NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"yellowCards" integer DEFAULT 0 NOT NULL,
	"redCards" integer DEFAULT 0 NOT NULL,
	"startedAt" date DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"finishedAt" date,
	CONSTRAINT "athlete_career_athleteId_teamId_pk" PRIMARY KEY("athleteId","teamId")
);
--> statement-breakpoint
CREATE TABLE "athlete_training_class_stats" (
	"athleteId" uuid NOT NULL,
	"trainingClassId" uuid NOT NULL,
	"present" boolean DEFAULT true,
	"notes" varchar(4096),
	"stats" jsonb,
	CONSTRAINT "athlete_training_class_stats_athleteId_trainingClassId_pk" PRIMARY KEY("athleteId","trainingClassId")
);
--> statement-breakpoint
CREATE TABLE "athlete" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"birthdate" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_athletes" (
	"athleteId" uuid NOT NULL,
	"matchId" uuid NOT NULL,
	"teamId" uuid NOT NULL,
	"position" varchar(255) NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"yellowCards" integer DEFAULT 0 NOT NULL,
	"redCards" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "match_athletes_athleteId_matchId_teamId_pk" PRIMARY KEY("athleteId","matchId","teamId")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp NOT NULL,
	"homeTeamId" uuid NOT NULL,
	"awayTeamId" uuid NOT NULL,
	"homeScore" integer DEFAULT 0 NOT NULL,
	"awayScore" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fullName" varchar(255) NOT NULL,
	"shortName" varchar(4),
	"iconUrl" varchar(1024),
	"mainColorHex" char(6),
	"secondaryColorHex" char(6),
	"createdBy" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_class" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainingId" uuid NOT NULL,
	"title" varchar(1024) NOT NULL,
	"description" varchar(4096),
	"notes" varchar(4096),
	"concluded" boolean DEFAULT false,
	"concludedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teamId" uuid NOT NULL,
	"date" date NOT NULL,
	"concluded" boolean DEFAULT false,
	"concludedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "athlete_career" ADD CONSTRAINT "athlete_career_athleteId_athlete_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athlete"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_career" ADD CONSTRAINT "athlete_career_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_training_class_stats" ADD CONSTRAINT "athlete_training_class_stats_athleteId_athlete_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athlete"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_training_class_stats" ADD CONSTRAINT "athlete_training_class_stats_trainingClassId_training_class_id_fk" FOREIGN KEY ("trainingClassId") REFERENCES "public"."training_class"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_athletes" ADD CONSTRAINT "match_athletes_athleteId_athlete_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athlete"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_athletes" ADD CONSTRAINT "match_athletes_matchId_matches_id_fk" FOREIGN KEY ("matchId") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_athletes" ADD CONSTRAINT "match_athletes_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeTeamId_teams_id_fk" FOREIGN KEY ("homeTeamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayTeamId_teams_id_fk" FOREIGN KEY ("awayTeamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_class" ADD CONSTRAINT "training_class_trainingId_trainings_id_fk" FOREIGN KEY ("trainingId") REFERENCES "public"."trainings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;