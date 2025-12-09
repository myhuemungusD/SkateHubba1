import { pgTable, text, timestamp, uuid, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { users } from "./users";

export const spots = pgTable("spots", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard", "pro"] }).default("medium"),
  type: text("type", { enum: ["street", "park", "diy", "famous"] }).default("street"),
  isLegendary: boolean("is_legendary").default(false),
  verified: boolean("verified").default(false),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
