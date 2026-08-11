/**
 * One-time admin user seed script.
 *
 * Usage (from the Replit shell):
 *   ADMIN_USERNAME=kristen ADMIN_PASSWORD=yourpassword tsx script/seed-admin.ts
 *
 * Safe to re-run: upserts by username so it won't create duplicates.
 * The password is bcrypt-hashed before storage — the plain-text value is
 * never written to the database.
 */

import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const { Pool } = pkg;

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error(
    "Error: ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required.\n" +
      "Example: ADMIN_USERNAME=kristen ADMIN_PASSWORD=... tsx script/seed-admin.ts"
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seedAdmin() {
  const hashed = await bcrypt.hash(password!, 12);

  // Check if user already exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, username!));

  if (existing) {
    // Update password
    await db
      .update(users)
      .set({ password: hashed })
      .where(eq(users.username, username!));
    console.log(`✓ Admin user "${username}" already existed — password updated.`);
  } else {
    // Insert new user
    await db.insert(users).values({ username: username!, password: hashed });
    console.log(`✓ Admin user "${username}" created successfully.`);
  }

  await pool.end();
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
