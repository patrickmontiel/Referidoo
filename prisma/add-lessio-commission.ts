import "dotenv/config";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

db.execute("ALTER TABLE Referral ADD COLUMN lessioCommission INTEGER")
  .then(() => { console.log("✓ lessioCommission añadido"); })
  .catch((e: Error) => { console.log("Info:", e.message); })
  .finally(() => db.close());
