import { join } from "node:path";
import { rm } from "node:fs/promises";
import { getSkillsDir, dirExists } from "../utils.mjs";

const MANAGED_SKILLS = ["project-setup", "find-skills"];

export async function uninstall() {
  const skillsDir = getSkillsDir();
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
    console.log("No agent-rig skills are installed.");
  } else {
    console.log(`\nRemoved ${removed} skill(s).`);
  }
}
