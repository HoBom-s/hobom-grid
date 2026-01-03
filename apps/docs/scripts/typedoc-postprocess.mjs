import fs from "fs";
import path from "path";

const REF = path.resolve("reference");

/**
 * 1) Rename README.md -> index.md recursively (if exists)
 * 2) Ensure folders that are linked as routes have index.md
 *    - Create index.md listing child markdown pages
 */
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      walk(full);
      ensureIndex(full);
      continue;
    }

    if (e.isFile() && e.name === "README.md") {
      const target = path.join(dir, "index.md");
      if (fs.existsSync(target)) fs.unlinkSync(full);
      else fs.renameSync(full, target);
    }
  }
}

function ensureIndex(dir) {
  const indexPath = path.join(dir, "index.md");
  if (fs.existsSync(indexPath)) return;

  // collect child markdown pages (one level)
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() && e.name.endsWith(".md") && e.name !== "index.md" && e.name !== "README.md",
    )
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  // also link immediate subdirs that contain markdown
  const subdirs = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  // If there’s nothing inside, don’t create a noisy index.
  if (entries.length === 0 && subdirs.length === 0) return;

  const title = dir.split(path.sep).pop() ?? "Reference";

  const lines = [];
  lines.push(`# ${humanize(title)}`);
  lines.push("");
  lines.push("> Auto-generated index for VitePress routing.");
  lines.push("");

  if (entries.length) {
    lines.push("## Pages");
    for (const file of entries) {
      const slug = file.replace(/\.md$/, "");
      lines.push(`- [\`${slug}\`](./${slug})`);
    }
    lines.push("");
  }

  if (subdirs.length) {
    lines.push("## Sections");
    for (const d of subdirs) {
      lines.push(`- [\`${d}\`](./${d}/)`);
    }
    lines.push("");
  }

  fs.writeFileSync(indexPath, lines.join("\n"), "utf8");
}

function humanize(s) {
  // functions -> Functions, type-aliases -> Type Aliases
  return s
    .split("-")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

if (!fs.existsSync(REF)) {
  console.warn(`reference dir not found: ${REF}`);
  process.exit(0);
}

walk(REF);
// ensure top-level too
ensureIndex(REF);

console.log("✔ typedoc postprocess: README→index + ensure folder index pages");
