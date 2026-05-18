const { spawn } = require("child_process");
const path = require("path");
const readline = require("readline");

const rootDir = process.cwd();
const aiDir = path.join(rootDir, "ai-service");
const isWindows = process.platform === "win32";

const children = [];
let shuttingDown = false;

function prefixOutput(stream, label, output) {
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => output.write(`[${label}] ${line}\n`));
}

function startProcess(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || rootDir,
    env: { ...process.env, ...options.env },
    shell: isWindows,
    stdio: ["inherit", "pipe", "pipe"],
  });

  children.push({ label, child });
  prefixOutput(child.stdout, label, process.stdout);
  prefixOutput(child.stderr, label, process.stderr);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev] ${label} exited with ${signal || `code ${code}`}`);
    stopAll(code || 1);
  });

  return child;
}

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const { child } of children) {
    if (!child.killed) {
      child.kill(isWindows ? undefined : "SIGTERM");
    }
  }

  setTimeout(() => process.exit(exitCode), 500);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

startProcess("ai", "python", ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"], {
  cwd: aiDir,
  env: {
    PYTHONUTF8: "1",
    PYTHONIOENCODING: "utf-8",
  },
});

startProcess("web", "npx", ["tsx", "server/index.ts"], {
  env: {
    NODE_ENV: "development",
    PORT: "5003",
    AI_SERVICE_URL: "http://localhost:8000",
  },
});

console.log("[dev] Web app: http://localhost:5003");
console.log("[dev] AI service: http://localhost:8000/docs");
