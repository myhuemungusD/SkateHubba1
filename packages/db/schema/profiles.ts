import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { users } from "./users";

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id).notNull().unique(),
  username: text("username").unique().notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  stance: text("stance", { enum: ["regular", "goofy"] }).default("regular"),
  xp: integer("xp").default(0),
  level: integer("level").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
