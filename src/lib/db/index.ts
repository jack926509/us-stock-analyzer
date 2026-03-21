import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db"
// better-sqlite3 expects a file path without the "file:" prefix
const dbPath = DATABASE_URL.replace(/^file:/, "")

const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })
