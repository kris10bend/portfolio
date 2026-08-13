CREATE TYPE "public"."content_block_type" AS ENUM('text', 'full-image', 'split-image', 'video');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "cms_content_blocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"position" integer NOT NULL,
	"type" "content_block_type" NOT NULL,
	"payload" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_media" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"case_study_label" text,
	"hero_image_id" varchar,
	"hero_image_url" text,
	"hero_image_alt" text,
	"metadata" json,
	"description" json,
	"quote" text,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"homepage_order" integer,
	"show_on_homepage" boolean DEFAULT false NOT NULL,
	"meta_description" text,
	"next_project_slug" text,
	"next_project_image_url" text,
	"card_overlay" text,
	"featured_image_url" text,
	"featured_image_alt" text,
	"featured_image_object_position" text,
	"featured_image_zoom" real,
	"featured_square_crop_x" real,
	"featured_square_crop_y" real,
	"featured_square_crop_zoom" real,
	"project_password_hash" varchar,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
