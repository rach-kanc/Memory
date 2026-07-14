#!/usr/bin/env node
// Disk space compaction daemon for local Memact memory stores.
//
// Usage:
//   node ./scripts/compaction-daemon.mjs --store memory.json [--interval 3600000] [--once]
//
// Runs on a repeating interval, permanently removing soft-deleted
// (forgotten/superseded/deleted) memories to reclaim disk space —
// without depending on a database engine's own vacuum/compaction.
import { readFile, writeFile } from "node:fs/promises";
import { runCompactionDaemon } from "../src/compaction-daemon.mjs";

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function usage() {
  console.error(
    [
      "Usage:",
      "  node ./scripts/compaction-daemon.mjs --store memory.json [--interval 3600000] [--once]",
      "",
      "Options:",
      "  --store     Path to the local JSON memory store (required)",
      "  --interval  Milliseconds between compaction runs (default: 3600000 / 1 hour)",
      "  --once      Run a single compaction pass and exit, instead of running forever",
    ].join("\n"),
  );
}

async function main() {
  const storePath = argValue("--store");
  if (!storePath) {
    usage();
    process.exit(1);
  }

  const intervalMs = Number(argValue("--interval", "3600000"));
  const runOnceOnly = process.argv.includes("--once");

  const repository = {
    async load() {
      return JSON.parse(await readFile(storePath, "utf8"));
    },
    async save(memoryStore) {
      await writeFile(storePath, JSON.stringify(memoryStore, null, 2), "utf8");
    },
  };

  const daemon = runCompactionDaemon(repository, {
    intervalMs,
    onCompact: ({ reclaimed }) => {
      console.log(`[compaction-daemon] reclaimed ${reclaimed} memories at ${new Date().toISOString()}`);
    },
  });

  if (runOnceOnly) {
    await daemon.runOnce();
    daemon.stop();
    return;
  }

  console.log(`[compaction-daemon] running every ${intervalMs}ms against ${storePath}. Press Ctrl+C to stop.`);
  process.on("SIGINT", () => {
    daemon.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Compaction daemon failed:", error);
  process.exit(1);
});