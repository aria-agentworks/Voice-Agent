import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const keywordsTable = pgTable("keywords", {
  id: text("id").primaryKey(),
  phrase: text("phrase").notNull(),
  score: integer("score").notNull(),
  category: text("category").notNull().default("custom"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Keyword = typeof keywordsTable.$inferSelect;
export type InsertKeyword = typeof keywordsTable.$inferInsert;
