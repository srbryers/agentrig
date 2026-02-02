#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith("-"));
// For init, the second non-flag arg is the template ID
const nonFlagArgs = args.filter((a) => !a.startsWith("-"));
const flags = {
  force: args.includes("--force") || args.includes("-f"),
  list: args.includes("--list"),
  dryRun: args.includes("--dry-run"),
  dir: args.includes("--dir")
    ? (() => {
        const val = args[args.indexOf("--dir") + 1];
        return val && !val.startsWith("-") ? val : undefined;
      })()
    : undefined,
  templateId: command === "init" ? nonFlagArgs[1] : undefined,
  query: command === "discover" ? nonFlagArgs[1] : undefined,
};

async function printVersion() {
  const pkg = JSON.parse(
    await readFile(join(__dirname, "..", "package.json"), "utf8")
  );
  console.log(`agentrig v${pkg.version}`);
}

function printHelp() {
  console.log(`
agentrig — Rig up your project for agentic coding

Usage:
  agentrig <command> [options]

Commands:
  install              Copy skill files to ~/.claude/skills/
  uninstall            Remove installed skill files
  status               Show installation status
  init <template>      Generate Claude Code config from a project-type template
  discover [query]     Search for community skills

Init Options:
  --list               List available templates
  --force              Overwrite existing files without prompting
  --dry-run            Show what would be generated without writing
  --dir <path>         Target directory (default: current directory)

General Options:
  --force, -f          Skip overwrite prompt during install
  --version            Print version
  --help               Print this help message
`.trim());
}

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  await printVersion();
  process.exit(0);
}

switch (command) {
  case "install": {
    const { install } = await import("../src/commands/install.mjs");
    await install(flags);
    break;
  }
  case "uninstall": {
    const { uninstall } = await import("../src/commands/uninstall.mjs");
    await uninstall();
    break;
  }
  case "status": {
    const { status } = await import("../src/commands/status.mjs");
    await status();
    break;
  }
  case "init": {
    const { init } = await import("../src/commands/init.mjs");
    await init(flags);
    break;
  }
  case "discover": {
    const { discover } = await import("../src/commands/discover.mjs");
    await discover(flags.query);
    break;
  }
  default:
    if (command) {
      console.error(`Unknown command: ${command}`);
    } else {
      console.error("No command specified.");
    }
    printHelp();
    process.exit(1);
}
