// PreToolUse guard for Edit|Write: blocks edits to secrets/credentials/certs so a session
// can't accidentally overwrite or leak them. Extend BLOCKED_PATTERNS per project as needed
// (e.g. a specific cert folder name, a vendor credentials file).
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = (input.tool_input && input.tool_input.file_path) || "";
  const normalized = filePath.replace(/\\/g, "/");

  const BLOCKED_PATTERNS = [
    /(^|\/)\.env(\.[^/]*)?$/i,
    /(^|\/)secrets?\//i,
    /(^|\/)credentials?\.(json|ya?ml)$/i,
    /\.(pem|key|p12|pfx)$/i,
  ];

  const blocked = BLOCKED_PATTERNS.some((re) => re.test(normalized));

  if (!blocked) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `Blocked by .claude/hooks/block-secrets.cjs: "${filePath}" matches a secret/credential path pattern. Edit it outside Claude Code if this is intentional.`,
      },
    })
  );
});
