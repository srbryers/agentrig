import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stat, cp, readdir, mkdir, writeFile, readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { execFile } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function resolveProjectRoot(flags) {
  return flags?.dir || process.cwd();
}

export function getSkillsDir(projectRoot) {
  return join(projectRoot, ".claude", "skills");
}

export function getPackageBundledDir() {
  return join(__dirname, "..", "skills");
}

export async function copyDir(src, dest) {
  await cp(src, dest, { recursive: true });
}

export async function dirExists(p) {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export async function listFiles(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(join(dir, entry.name), rel)));
    } else {
      files.push(rel);
    }
  }
  return files;
}

export function promptYesNo(question) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

export async function writeFileWithDir(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

export async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readFileIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export function mergeSettingsJson(existing, newHooks) {
  let settings;
  try {
    settings = existing ? JSON.parse(existing) : {};
  } catch {
    settings = {};
  }

  for (const [event, hookList] of Object.entries(newHooks)) {
    if (!Array.isArray(hookList)) continue;
    if (!settings[event]) {
      settings[event] = [];
    }
    for (const hook of hookList) {
      const alreadyExists = settings[event].some(
        (h) => h.matcher === hook.matcher && h.command === hook.command
      );
      if (!alreadyExists) {
        settings[event].push(hook);
      }
    }
  }

  return JSON.stringify(settings, null, 2);
}

export function mergeMcpJson(existing, newServers) {
  let mcp;
  try {
    mcp = existing ? JSON.parse(existing) : {};
  } catch {
    mcp = {};
  }

  if (!mcp.mcpServers) {
    mcp.mcpServers = {};
  }

  for (const [name, config] of Object.entries(newServers)) {
    if (!mcp.mcpServers[name]) {
      mcp.mcpServers[name] = config;
    }
  }

  return JSON.stringify(mcp, null, 2);
}

export function execCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, {
      timeout: options.timeout || 30000,
      maxBuffer: 1024 * 1024,
      // shell: true is required for Windows where npx is a .cmd shim
      // that execFile cannot resolve without a shell. Input sanitization
      // is handled by callers (e.g., discover.mjs strips metacharacters).
      shell: true,
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (error.code ?? 1) : 0,
        stdout: stdout?.toString() || "",
        stderr: stderr?.toString() || "",
      });
    });
  });
}
