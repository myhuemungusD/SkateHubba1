import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { closets } from "./closets";

export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ["deck", "wheels", "trucks", "griptape", "clothing", "accessory"] }).notNull(),
  rarity: text("rarity", { enum: ["common", "uncommon", "rare", "epic", "legendary"] }).default("common"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const closetItems = pgTable("closet_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  closetId: uuid("closet_id").references(() => closets.id).notNull(),
  itemId: uuid("item_id").references(() => items.id).notNull(),
  acquiredAt: timestamp("acquired_at").defaultNow().notNull(),
});
