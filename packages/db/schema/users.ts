import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  handle: text("handle").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});