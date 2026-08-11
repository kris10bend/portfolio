import { type User, type InsertUser, users, cmsProjects, type CmsProject, type InsertCmsProject } from "@shared/schema";
import { db } from "./db";
import { eq, isNull, asc } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
