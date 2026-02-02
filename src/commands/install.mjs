import { join } from "node:path";
import { readdir } from "node:fs/promises";
import {
  getSkillsDir,
  getPackageBundledDir,
  copyDir,
  dirExists,
  listFiles,
  promptYesNo,
} from "../utils.mjs";

export async function install(flags) {
  const skillsDir = getSkillsDir();
  const bundledDir = getPackageBundledDir();

  // Read all subdirectories under the bundled skills/ dir
  let bundledSkills;
  try {
    const entries = await readdir(bundledDir, { withFileTypes: true });
    bundledSkills = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    console.error("No bundled skills found.");
    return;
  }

  if (bundledSkills.length === 0) {
    console.error("No bundled skills found.");
    return;
  }

  // Check if any target already exists
  let anyExists = false;
  for (const name of bundledSkills) {
    if (await dirExists(join(skillsDir, name))) {
      anyExists = true;
      break;
    }
  }

  if (anyExists && !flags.force) {
    const ok = await promptYesNo("Skills already installed. Overwrite?");
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }

  // Copy each bundled skill
  let totalFiles = 0;
  for (const name of bundledSkills) {
    const source = join(bundledDir, name);
    const target = join(skillsDir, name);
    await copyDir(source, target);
    const files = await listFiles(target);
    totalFiles += files.length;
    console.log(`Installed ${name}/ (${files.length} files) to ${target}`);
    for (const f of files) {
      console.log(`  ${f}`);
    }
  }

  console.log(`\nTotal: ${bundledSkills.length} skill(s), ${totalFiles} file(s)`);
}
