import { execCommand } from "../utils.mjs";

export async function discover(query) {
  if (!query) {
    console.error("Usage: agentrig discover <query>");
    console.error("Example: agentrig discover react");
    process.exit(1);
  }

  // Sanitize query: strip shell metacharacters
  const sanitized = query.replace(/[;&|`$(){}[\]<>!#\\'"]/g, "").trim();
  if (!sanitized) {
    console.error("Invalid query.");
    process.exit(1);
  }

  console.log(`Searching for skills: ${sanitized}\n`);

  const result = await execCommand("npx", ["skills", "find", sanitized], {
    timeout: 15000,
  });

  if (result.exitCode !== 0) {
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
    console.error("\nSkill search failed. Browse skills at https://skills.sh");
    process.exit(1);
  }

  const output = result.stdout.trim();
  if (output) {
    console.log(output);
  } else {
    console.log("No results found.");
  }

  console.log("\nInstall a skill: npx skills add <owner/repo> --skill <name>");
  console.log("Browse more: https://skills.sh");
}
