import { execSync } from "node:child_process";

function run(command) {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const branch = run("git branch --show-current");

if (branch !== "main") {
  fail(`Release aborted: current branch is "${branch}", expected "main".`);
}

const status = run("git status --short");

if (status.length > 0) {
  fail("Release aborted: working tree is not clean. Commit or stash your changes first.");
}

console.log("Release check passed: on main with a clean working tree.");
