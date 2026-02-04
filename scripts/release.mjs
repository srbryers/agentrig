#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join } from "node:path";

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: npm run release <version>");
  console.error("Example: npm run release 0.7.0");
  process.exit(1);
}

const root = new URL("..", import.meta.url).pathname;
const pkgPath = join(root, "package.json");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

// 1. Bump version in package.json
const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
const oldVersion = pkg.version;
pkg.version = version;
await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`Bumped version: ${oldVersion} → ${version}`);

// 2. Commit and push
run(`git add package.json`);
run(`git commit -m "Bump version to ${version}"`);
run(`git push`);

// 3. Create GitHub release (triggers npm publish via Actions)
run(`gh release create v${version} --generate-notes`);

console.log(`\nReleased v${version}`);
