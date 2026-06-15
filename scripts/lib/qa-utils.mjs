import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";

export function assertSafeSetId(setId) {
  if (!/^[a-z0-9_]+$/.test(setId ?? "")) {
    throw new Error(`Unsafe set_id: ${setId}`);
  }
}

export function sqlString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

export function sqlNullableString(value) {
  return value === undefined || value === null || value === "" ? "null" : sqlString(value);
}

export function sqlJson(value) {
  return `${sqlString(JSON.stringify(value ?? {}))}::jsonb`;
}

export function sqlLiteralList(values) {
  const unique = [...new Set(values.filter((value) => value !== undefined && value !== null))];
  return unique.length ? unique.map(sqlString).join(", ") : "null";
}

export async function psqlJson(sql, maxBuffer = 1024 * 1024 * 20) {
  const { stdout } = await execFileAsync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql],
    { maxBuffer }
  );
  return JSON.parse(stdout.trim() || "[]");
}

export async function psqlExec(sql, maxBuffer = 1024 * 1024 * 20) {
  if (sql.length > 100_000) {
    const tmpDir = path.join(process.cwd(), "outputs", "tmp");
    await mkdir(tmpDir, { recursive: true });
    const tmpPath = path.join(
      tmpDir,
      `psql-exec-${new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z")}-${process.pid}.sql`
    );
    await writeFile(tmpPath, sql, "utf8");
    return execFileAsync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", tmpPath], {
      maxBuffer,
    });
  }

  return execFileAsync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], {
    maxBuffer,
  });
}

export function parseContextExampleKey(targetKey) {
  const parts = String(targetKey ?? "").split("::");
  if (parts.length !== 3 || !/^\d+$/.test(parts[2])) {
    throw new Error(`Expected context example key set_id::meaning_id::example_id, got: ${targetKey}`);
  }
  return {
    setId: parts[0],
    meaningId: parts[1],
    exampleId: parts[2],
  };
}

export function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (inQuotes && char === '"' && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell !== "")) rows.push(row);
  if (rows.length === 0) return [];

  const [headers, ...records] = rows;
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]))
  );
}

export async function readRows(filePath) {
  const content = await readFile(filePath, "utf8");
  if (path.extname(filePath).toLowerCase() === ".jsonl") {
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  return parseCsv(content);
}

export function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows, headers) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}
