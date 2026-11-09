// Applies every .sql file in a directory, in name order.
//   node migrate.js        -> migrations/ (runs on every container start, so files must be idempotent)
//   node migrate.js seed   -> seed/ (demo data)
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function migrate(dirName) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const dir = path.join(__dirname, dirName);
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      console.log(`Running ${dirName}/${file}`);
      await pool.query(sql);
      console.log(`  ✓ ${file}`);
    }
  } finally {
    await pool.end();
  }
}

migrate(process.argv[2] ?? "migrations").catch(err => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
