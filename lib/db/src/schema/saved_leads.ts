import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savedLeadsTable = pgTable("saved_leads", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  text: text("text").notNull(),
  url: text("url"),
  contact: text("contact"),
  intentScore: text("intent_score").notNull(),
  intentLabel: text("intent_label").notNull(),
  subreddit: text("subreddit"),
  author: text("author"),
  saved: boolean("saved").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
});

export const insertSavedLeadSchema = createInsertSchema(savedLeadsTable).omit({
  savedAt: true,
});
export type InsertSavedLead = z.infer<typeof insertSavedLeadSchema>;
export type SavedLead = typeof savedLeadsTable.$inferSelect;
