import { execSync } from "node:child_process";

const port = process.env.PORT || "5000";

function killPort(p) {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${p} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`,
      { encoding: "utf8" }
    );
    const pids = [...new Set(out.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^\d+$/.test(s)))];
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Killed process ${pid} on port ${p}`);
      } catch {
        // process may already be gone
      }
    }
    if (!pids.length) console.log(`Port ${p} is free`);
  } catch {
    console.log(`Port ${p} is free`);
  }
}

killPort(port);
