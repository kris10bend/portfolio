import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  json,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "published",
]);

export const contentBlockTypeEnum = pgEnum("content_block_type", [
  "text",
  "full-image",
  "split-image",
]);

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── cms_projects ─────────────────────────────────────────────────────────────

export const cmsProjects = pgTable("cms_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  caseStudyLabel: text("case_study_label"),
  heroImageId: varchar("hero_image_id"),
  heroImageUrl: text("hero_image_url"),
  heroImageAlt: text("hero_image_alt"),
  metadata: json("metadata"),
  description: json("description"),
  quote: text("quote"),
  status: projectStatusEnum("status").notNull().default("draft"),
  homepageOrder: integer("homepage_order"),
  showOnHomepage: boolean("show_on_homepage").notNull().default(false),
  metaDescription: text("meta_description"),
  nextProjectSlug: text("next_project_slug"),
  nextProjectImageUrl: text("next_project_image_url"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertCmsProjectSchema = createInsertSchema(cmsProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCmsProject = z.infer<typeof insertCmsProjectSchema>;
export type CmsProject = typeof cmsProjects.$inferSelect;

// ─── cms_content_blocks ───────────────────────────────────────────────────────

export const cmsContentBlocks = pgTable("cms_content_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  position: integer("position").notNull(),
  type: contentBlockTypeEnum("type").notNull(),
  payload: json("payload"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertCmsContentBlockSchema = createInsertSchema(
  cmsContentBlocks
).omit({ id: true, createdAt: true });

export type InsertCmsContentBlock = z.infer<typeof insertCmsContentBlockSchema>;
export type CmsContentBlock = typeof cmsContentBlocks.$inferSelect;

// ─── cms_media ────────────────────────────────────────────────────────────────

export const cmsMedia = pgTable("cms_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertCmsMediaSchema = createInsertSchema(cmsMedia).omit({
  id: true,
  createdAt: true,
});

export type InsertCmsMedia = z.infer<typeof insertCmsMediaSchema>;
export type CmsMedia = typeof cmsMedia.$inferSelect;
