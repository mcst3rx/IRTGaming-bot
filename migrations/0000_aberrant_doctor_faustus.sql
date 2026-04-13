CREATE TABLE "bannedWords" (
	"word" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dailyMsgs" (
	"id" serial PRIMARY KEY NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmNames" (
	"name" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playerTimes22" (
	"name" text PRIMARY KEY NOT NULL,
	"uuid" varchar(44),
	"discord_id" text,
	"servers" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playerTimes25" (
	"name" text PRIMARY KEY NOT NULL,
	"uuid" varchar(44),
	"discord_id" text,
	"servers" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "punishments" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"overwritten" boolean DEFAULT false NOT NULL,
	"time" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"overwrites" integer,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"time" timestamp with time zone NOT NULL,
	"channel_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tfNames" (
	"name" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userLevels" (
	"user_id" text PRIMARY KEY NOT NULL,
	"message_count" integer NOT NULL,
	"level" integer NOT NULL,
	"has_left" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchList" (
	"name" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"is_severe" boolean NOT NULL,
	"reference" text
);
--> statement-breakpoint
CREATE TABLE "watchListPings" (
	"user_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whitelist" (
	"name" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "punishments" ADD CONSTRAINT "punishments_overwrites_punishments_id_fk" FOREIGN KEY ("overwrites") REFERENCES "public"."punishments"("id") ON DELETE no action ON UPDATE no action;