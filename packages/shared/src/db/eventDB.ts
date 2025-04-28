import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config";
import * as schema from "./eventSchema";

const ssl = config.USE_DATABASE_SSL ? { rejectUnauthorized: false } : false;

export const eventPool = new Pool({
  connectionString: process.env.EVENT_DATABASE_URL,
  ssl,
});

export const eventDB = drizzle(eventPool, { schema });
