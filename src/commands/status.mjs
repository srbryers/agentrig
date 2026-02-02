import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { getSkillsDir, getPackageBundledDir, dirExists, listFiles } from "../utils.mjs";

export async function status() {
  const skillsDir = getSkillsDir();
  const bundledDir = getPackageBundledDir();

  // Get all bundled skills
  let bundledSkills = [];
  try {
    const entries = await readdir(bundledDir, { withFileTypes: true });
    bundledSkills = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    // ignore
  }

  if (bundledSkills.length === 0) {
    console.log("No bundled skills found.");
    return;
  }

  // Report status for each bundled skill
  for (const name of bundledSkills) {
    const target = join(skillsDir, name);
    const source = join(bundledDir, name);

    if (!(await dirExists(target))) {
      console.log(`${name}: not installed`);
      continue;
    }

    const installedFiles = await listFiles(target);
    const bundledFiles = await listFiles(source);

    const installedSet = new Set(installedFiles);
    const bundledSet = new Set(bundledFiles);

    const missing = bundledFiles.filter((f) => !installedSet.has(f));
    const extra = installedFiles.filter((f) => !bundledSet.has(f));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`${name}: installed`);
    } else {
      console.log(`${name}: outdated`);
      if (missing.length > 0) {
        console.log(`  Missing: ${missing.join(", ")}`);
      }
      if (extra.length > 0) {
        console.log(`  Extra:   ${extra.join(", ")}`);
      }
    }

    console.log(`  Path: ${target}`);
    console.log(`  Files: ${installedFiles.length}`);
  }

  // Report template count from project-setup
  const projectSetupTarget = join(skillsDir, "project-setup");
  const templatesDir = join(projectSetupTarget, "templates");
  if (await dirExists(templatesDir)) {
    const templateFiles = await listFiles(templatesDir);
    const templateCount = templateFiles.filter(
      (f) => f.endsWith(".md") && f !== "_index.md"
    ).length;
    console.log(`\nTemplates: ${templateCount}`);
  }
}
