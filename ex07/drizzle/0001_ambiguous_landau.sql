CREATE TABLE "articles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "articles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"date" date NOT NULL,
	"section" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"link" text NOT NULL,
	"source_id" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	CONSTRAINT "articles_date_link_unique" UNIQUE("date","link")
);
--> statement-breakpoint
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "collect_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "collect_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"date" date NOT NULL,
	"section" text NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"article_count" integer NOT NULL,
	"finished_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collect_runs" ENABLE ROW LEVEL SECURITY;