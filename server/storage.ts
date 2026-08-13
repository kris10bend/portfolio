import { type User, type InsertUser, users, cmsProjects, type CmsProject, type InsertCmsProject, cmsMedia, type CmsMedia, type InsertCmsMedia, cmsContentBlocks, type CmsContentBlock, type InsertCmsContentBlock } from "@shared/schema";
import { db } from "./db";
import { eq, isNull, asc, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // CMS Projects
  getCmsProjects(): Promise<CmsProject[]>;
  /** Returns published, non-archived projects with showOnHomepage=true, ordered for the homepage grid. */
  getPublishedHomepageProjects(): Promise<CmsProject[]>;
  /** Returns a published, non-archived project by slug (for the public /work/:slug page). */
  getPublishedCmsProjectBySlug(slug: string): Promise<CmsProject | undefined>;
  /** Returns ANY project by slug, regardless of status/archived — used to prevent static fallback from resurrecting CMS-managed records. */
  getCmsProjectBySlugAny(slug: string): Promise<CmsProject | undefined>;
  /** Returns the set of all slugs present in the DB (any status, incl. archived) — used to filter static fallbacks. */
  getAllCmsProjectSlugs(): Promise<Set<string>>;
  getCmsProjectById(id: string): Promise<CmsProject | undefined>;
  createCmsProject(project: Partial<InsertCmsProject>): Promise<CmsProject>;
  updateCmsProject(id: string, updates: Partial<InsertCmsProject>): Promise<CmsProject | undefined>;
  archiveCmsProject(id: string): Promise<void>;
  restoreCmsProject(id: string): Promise<void>;
  updateCmsProjectsOrder(items: { id: string; homepageOrder: number | null }[]): Promise<void>;

  // CMS Content Blocks
  getContentBlocksByProjectId(projectId: string): Promise<CmsContentBlock[]>;
  replaceContentBlocks(projectId: string, blocks: Omit<InsertCmsContentBlock, 'projectId'>[]): Promise<void>;
  /** Update project fields and replace its content blocks atomically in one transaction. */
  updateProjectWithBlocks(
    id: string,
    updates: Partial<InsertCmsProject>,
    blocks: Omit<InsertCmsContentBlock, 'projectId'>[]
  ): Promise<{ project: CmsProject; blocks: CmsContentBlock[] }>;

  // CMS Media
  createCmsMedia(media: InsertCmsMedia): Promise<CmsMedia>;
  getCmsMedia(): Promise<CmsMedia[]>;
  getCmsMediaById(id: string): Promise<CmsMedia | undefined>;
  deleteCmsMedia(id: string): Promise<void>;
  isMediaReferenced(id: string, url?: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // ─── Users ──────────────────────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // ─── CMS Projects ─────────────────────────────────────────────────────────

  /** Returns all non-archived projects ordered by homepageOrder then createdAt. */
  async getCmsProjects(): Promise<CmsProject[]> {
    return db
      .select()
      .from(cmsProjects)
      .where(isNull(cmsProjects.archivedAt))
      .orderBy(asc(cmsProjects.homepageOrder), asc(cmsProjects.createdAt));
  }

  async getPublishedHomepageProjects(): Promise<CmsProject[]> {
    return db
      .select()
      .from(cmsProjects)
      .where(
        sql`status = 'published' AND archived_at IS NULL AND show_on_homepage = true`
      )
      .orderBy(asc(cmsProjects.homepageOrder), asc(cmsProjects.createdAt));
  }

  async getPublishedCmsProjectBySlug(slug: string): Promise<CmsProject | undefined> {
    const [project] = await db
      .select()
      .from(cmsProjects)
      .where(sql`slug = ${slug} AND status = 'published' AND archived_at IS NULL`);
    return project;
  }

  async getCmsProjectBySlugAny(slug: string): Promise<CmsProject | undefined> {
    const [project] = await db
      .select()
      .from(cmsProjects)
      .where(eq(cmsProjects.slug, slug));
    return project;
  }

  async getAllCmsProjectSlugs(): Promise<Set<string>> {
    const rows = await db.select({ slug: cmsProjects.slug }).from(cmsProjects);
    return new Set(rows.map((r) => r.slug));
  }

  async getCmsProjectById(id: string): Promise<CmsProject | undefined> {
    const [project] = await db
      .select()
      .from(cmsProjects)
      .where(eq(cmsProjects.id, id));
    return project;
  }

  async createCmsProject(project: Partial<InsertCmsProject>): Promise<CmsProject> {
    // Generate a unique slug from timestamp
    const slug = `project-${Date.now()}`;
    const [created] = await db
      .insert(cmsProjects)
      .values({
        slug,
        title: "",
        status: "draft",
        showOnHomepage: false,
        ...project,
      })
      .returning();
    return created;
  }

  async updateCmsProject(
    id: string,
    updates: Partial<InsertCmsProject>
  ): Promise<CmsProject | undefined> {
    const [updated] = await db
      .update(cmsProjects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cmsProjects.id, id))
      .returning();
    return updated;
  }

  /** Soft-archive: sets archivedAt; project is hidden from public and admin list. */
  async archiveCmsProject(id: string): Promise<void> {
    await db
      .update(cmsProjects)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(cmsProjects.id, id));
  }

  /** Restore a previously archived project. */
  async restoreCmsProject(id: string): Promise<void> {
    await db
      .update(cmsProjects)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(cmsProjects.id, id));
  }

  async updateCmsProjectsOrder(
    items: { id: string; homepageOrder: number | null }[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const { id, homepageOrder } of items) {
        await tx
          .update(cmsProjects)
          .set({ homepageOrder: homepageOrder ?? null, updatedAt: new Date() })
          .where(eq(cmsProjects.id, id));
      }
    });
  }

  // ─── CMS Content Blocks ───────────────────────────────────────────────────

  async getContentBlocksByProjectId(projectId: string): Promise<CmsContentBlock[]> {
    return db
      .select()
      .from(cmsContentBlocks)
      .where(eq(cmsContentBlocks.projectId, projectId))
      .orderBy(asc(cmsContentBlocks.position));
  }

  /**
   * Replaces all content blocks for a project in a single transaction.
   * Existing blocks are deleted and the new list is inserted with sequential positions.
   */
  async replaceContentBlocks(
    projectId: string,
    blocks: Omit<InsertCmsContentBlock, 'projectId'>[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(cmsContentBlocks).where(eq(cmsContentBlocks.projectId, projectId));
      if (blocks.length > 0) {
        await tx.insert(cmsContentBlocks).values(
          blocks.map((b, i) => ({ ...b, projectId, position: i }))
        );
      }
    });
  }

  /** Update project fields + replace blocks in a single DB transaction. */
  async updateProjectWithBlocks(
    id: string,
    updates: Partial<InsertCmsProject>,
    blocks: Omit<InsertCmsContentBlock, 'projectId'>[]
  ): Promise<{ project: CmsProject; blocks: CmsContentBlock[] }> {
    let project!: CmsProject;
    let newBlocks!: CmsContentBlock[];
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(cmsProjects)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(cmsProjects.id, id))
        .returning();
      project = updated;

      await tx.delete(cmsContentBlocks).where(eq(cmsContentBlocks.projectId, id));
      if (blocks.length > 0) {
        newBlocks = await tx
          .insert(cmsContentBlocks)
          .values(blocks.map((b, i) => ({ ...b, projectId: id, position: i })))
          .returning();
      } else {
        newBlocks = [];
      }
    });
    return { project, blocks: newBlocks };
  }

  // ─── CMS Media ────────────────────────────────────────────────────────────

  async createCmsMedia(media: InsertCmsMedia): Promise<CmsMedia> {
    const [created] = await db.insert(cmsMedia).values(media).returning();
    return created;
  }

  async getCmsMedia(): Promise<CmsMedia[]> {
    return db.select().from(cmsMedia).orderBy(desc(cmsMedia.createdAt));
  }

  async getCmsMediaById(id: string): Promise<CmsMedia | undefined> {
    const [media] = await db.select().from(cmsMedia).where(eq(cmsMedia.id, id));
    return media;
  }

  async deleteCmsMedia(id: string): Promise<void> {
    await db.delete(cmsMedia).where(eq(cmsMedia.id, id));
  }

  /**
   * Returns true if any cms_projects or cms_content_blocks row references this
   * media asset (by ID or by URL).
   *
   * Checked columns:
   * - cms_projects.heroImageId        (legacy media-ID reference)
   * - cms_projects.heroImageUrl       (URL stored by the editor ImagePicker)
   * - cms_projects.nextProjectImageUrl (teaser image URL)
   * - cms_content_blocks.payload      (all block image URLs stored in JSON)
   */
  async isMediaReferenced(id: string, url?: string): Promise<boolean> {
    // Check heroImageId references in projects (stored as media ID)
    const [projectIdRef] = await db
      .select({ id: cmsProjects.id })
      .from(cmsProjects)
      .where(eq(cmsProjects.heroImageId, id))
      .limit(1);
    if (projectIdRef) return true;

    // Check URL-based columns in projects when a URL is provided
    if (url) {
      const [heroUrlRef] = await db
        .select({ id: cmsProjects.id })
        .from(cmsProjects)
        .where(eq(cmsProjects.heroImageUrl, url))
        .limit(1);
      if (heroUrlRef) return true;

      const [nextImgRef] = await db
        .select({ id: cmsProjects.id })
        .from(cmsProjects)
        .where(eq(cmsProjects.nextProjectImageUrl, url))
        .limit(1);
      if (nextImgRef) return true;

      const [featuredImgRef] = await db
        .select({ id: cmsProjects.id })
        .from(cmsProjects)
        .where(eq(cmsProjects.featuredImageUrl, url))
        .limit(1);
      if (featuredImgRef) return true;
    }

    // Check payload JSON in content blocks for the media ID or URL.
    const searchTerms = [id];
    if (url) searchTerms.push(url);

    for (const term of searchTerms) {
      const [blockRef] = await db
        .select({ id: cmsContentBlocks.id })
        .from(cmsContentBlocks)
        .where(sql`payload::text LIKE ${'%' + term + '%'}`)
        .limit(1);
      if (blockRef) return true;
    }

    return false;
  }
}

export const storage = new DatabaseStorage();
