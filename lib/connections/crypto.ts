// AES-256-GCM for secrets at rest. The key lives outside the database
// (APP_SECRET, or a file generated on first use in the app_data volume).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

let cached: Buffer | null = null;

function key(): Buffer {
  if (cached) return cached;
  if (process.env.APP_SECRET) {
    cached = crypto.createHash("sha256").update(process.env.APP_SECRET).digest();
    return cached;
  }
  // resolve, not join: an absolute APP_DATA_DIR must stay absolute
  const dir = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.APP_DATA_DIR ?? "data");
  const file = path.join(dir, "secret.key");
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, { recursive: true });
    // wx: never overwrite a key another process just wrote
    try {
      fs.writeFileSync(file, crypto.randomBytes(32).toString("base64"), { mode: 0o600, flag: "wx" });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }
  cached = Buffer.from(fs.readFileSync(file, "utf8").trim(), "base64");
  if (cached.length !== 32) throw new Error(`Encryption key in ${file} is not 32 bytes`);
  return cached;
}

export function encrypt(plain: string, k: Buffer = key()): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return "v1:" + Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}

export function decrypt(blob: string, k: Buffer = key()): string {
  if (!blob.startsWith("v1:")) throw new Error("Unknown secret format");
  const raw = Buffer.from(blob.slice(3), "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", k, raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}
