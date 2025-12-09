import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { spots } from "./spots";

export const clips = pgTable("clips", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  spotId: uuid("spot_id").references(() => spots.id),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  trickName: text("trick_name"),
  description: text("description"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
