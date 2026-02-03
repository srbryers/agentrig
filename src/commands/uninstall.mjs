import { join } from "node:path";
import { rm } from "node:fs/promises";
import { resolveProjectRoot, getSkillsDir, dirExists } from "../utils.mjs";

const MANAGED_SKILLS = ["project-setup", "find-skills", "self-improve"];

export async function uninstall(flags) {
  const projectRoot = resolveProjectRoot(flags);
  const skillsDir = getSkillsDir(projectRoot);
  let removed = 0;

  for (const name of MANAGED_SKILLS) {
    const target = join(skillsDir, name);
    if (await dirExists(target)) {
      await rm(target, { recursive: true, force: true });
      console.log(`Removed ${target}`);
      removed++;
    }
  }

  if (removed === 0) {
    console.log("No agentic-rig skills are installed.");
  } else {
    console.log(`\nRemoved ${removed} skill(s).`);
  }
}
