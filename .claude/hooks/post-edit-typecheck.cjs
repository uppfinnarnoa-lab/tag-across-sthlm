// PostToolUse hook -- type-checks a changed frontend file. The TypeScript
// project (and its node_modules) lives in frontend/, not the repo root, so
// this runs tsc from there instead of process.cwd(). Only fires for files
// under frontend/ -- the backend is plain JS.
// Keep it FAST (single-project --noEmit, not a full build) -- runs on every edit.
const { execFileSync } = require("child_process");
const path = require("path");

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = (input.tool_input && input.tool_input.file_path) || (input.tool_response && input.tool_response.filePath) || "";
  const normalized = filePath.replace(/\\/g, "/");
  if (!/\.tsx?$/.test(normalized) || !/(^|\/)frontend\//.test(normalized)) process.exit(0);

  const frontendDir = path.join(__dirname, "..", "..", "frontend");
  try {
    const tscBin = require.resolve("typescript/bin/tsc", { paths: [frontendDir] });
    execFileSync(process.execPath, [tscBin, "-b", "--noEmit"], { cwd: frontendDir, stdio: "pipe" });
    process.exit(0);
  } catch (err) {
    const output = `${err.stdout || ""}${err.stderr || ""}`.trim();
    process.stderr.write(output || "tsc --noEmit failed with no output\n");
    process.exit(2);
  }
});
