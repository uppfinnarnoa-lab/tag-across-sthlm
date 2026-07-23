// SessionStart hook: automates CLAUDE.md's "Session Start -- git pull" step so every
// session begins with an accurate base without a manual Bash round-trip.
// Only pulls when the working tree is clean -- never merges on top of uncommitted work.
const { execFileSync } = require("child_process");

function run(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch (err) {
    return `ERROR: ${(err.stdout || err.stderr || err.message || "").toString().trim()}`;
  }
}

const status = run(["status", "--porcelain"]);
const branch = run(["branch", "--show-current"]);

let pullResult;
if (status.startsWith("ERROR")) {
  pullResult = "skipped (could not read git status -- is this a git repo yet?)";
} else if (status.length > 0) {
  pullResult = "skipped -- working tree has uncommitted changes, pull manually if needed";
} else {
  pullResult = run(["pull", "--ff-only"]);
}

const context = [
  `git branch: ${branch}`,
  `git pull --ff-only: ${pullResult}`,
  status.length > 0 ? `uncommitted changes present:\n${status}` : "working tree clean",
].join("\n");

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context,
    },
  })
);
