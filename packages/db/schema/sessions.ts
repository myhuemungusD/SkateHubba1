import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { spots } from "./spots";

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  spotId: uuid("spot_id").references(() => spots.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  notes: text("notes"),
  status: text("status", { enum: ["active", "completed", "cancelled"] }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
