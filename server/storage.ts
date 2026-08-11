import { type User, type InsertUser, users, cmsProjects, type CmsProject, type InsertCmsProject, cmsMedia, type CmsMedia, type InsertCmsMedia, cmsContentBlocks } from "@shared/schema";
import { db } from "./db";
import { eq, isNull, asc, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // CMS Projects
  getCmsProjects(): Promise<CmsProject[]>;
  getCmsProjectById(id: string): Promise<CmsProject | undefined>;
  createCmsProject(project: Partial<InsertCmsProject>): Promise<CmsProject>;
  updateCmsProject(id: string, updates: Partial<InsertCmsProject>): Promise<CmsProject | undefined>;
  archiveCmsProject(id: string): Promise<void>;
  restoreCmsProject(id: string): Promise<void>;
  updateCmsProjectsOrder(items: { id: string; homepageOrder: number }[]): Promise<void>;

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
    items: { id: string; homepageOrder: number }[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const { id, homepageOrder } of items) {
        await tx
          .update(cmsProjects)
          .set({ homepageOrder, updatedAt: new Date() })
          .where(eq(cmsProjects.id, id));
      }
    });
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
   * Returns true if any cms_content_blocks payload JSON references this media,
   * or if any cms_projects has this media as its heroImageId.
   *
   * Content blocks store the public URL (e.g. "/uploads/uuid.jpg") rather than
   * the cms_media row ID, so we check both the ID (for heroImageId FK) and the
   * URL (for block payloads). This prevents deleting images that are in use on
   * public pages even if the block schema evolves.
   */
  async isMediaReferenced(id: string, url?: string): Promise<boolean> {
    // Check heroImageId references in projects (stored as media ID)
    const [projectRef] = await db
      .select({ id: cmsProjects.id })
      .from(cmsProjects)
      .where(eq(cmsProjects.heroImageId, id))
      .limit(1);
    if (projectRef) return true;

    // Check payload JSON in content blocks for the media ID or URL.
    // Blocks typically store the URL, but we search for both to be future-safe.
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
