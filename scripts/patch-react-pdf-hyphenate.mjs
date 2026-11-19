/**
 * @react-pdf/hyphenate@0.1.0 only exports `import` conditions.
 * Next/tsx require-style resolvers fail with ERR_PACKAGE_PATH_NOT_EXPORTED
 * for `@react-pdf/hyphenate/en-us`. Add a `default` condition (upstream PR #3623).
 */
import fs from "node:fs";
import path from "node:path";

const pkgPath = path.join(
  process.cwd(),
  "node_modules",
  "@react-pdf",
  "hyphenate",
  "package.json"
);

if (!fs.existsSync(pkgPath)) {
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const exportsMap = pkg.exports;
if (!exportsMap || typeof exportsMap !== "object") process.exit(0);

let changed = false;
for (const [key, value] of Object.entries(exportsMap)) {
  if (!value || typeof value !== "object" || Array.isArray(value)) continue;
  if (value.import && !value.default) {
    value.default = value.import;
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log("[patch-react-pdf-hyphenate] added default export conditions");
}
