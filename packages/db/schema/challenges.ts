import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";

export const challenges = pgTable("challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").notNull(),
  type: text("type", { enum: ["daily", "weekly", "achievement"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
