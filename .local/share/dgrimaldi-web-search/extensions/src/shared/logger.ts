/**
 * Logger — persistent structured logging via Pino.
 *
 * Logs are written to a file in the pi agent directory so they survive
 * across sessions.  Uses Pino's native file transport for JSON lines
 * output that can be piped through `jaq` or `pino-pretty`.
 *
 * Usage:
 *   import { logger } from "./logger";
 *
 *   logger.info({ tool: "websearch" }, "Search completed");
 *   logger.error({ error: err }, "Search failed");
 *   logger.debug({ query: "hello" }, "Debug payload");
 */

import ThreadStream = require("thread-stream");
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { pino, stdSerializers, transport, type Logger } from "pino";
// ---------------------------------------------------------------------------
// Log file path — placed inside the pi agent data dir so it persists across
// restarts and is easy to find with `pi session` or by reading the agent dir.
// ---------------------------------------------------------------------------

let logger: Logger | undefined;
let transporter: ThreadStream | undefined;

function getAgentDataDir(): string {
  // Try to import from pi-coding-agent; fall back to a deterministic path.
  try {
    const { getAgentDir } = require("@earendil-works/pi-coding-agent") as {
      getAgentDir: () => string;
    };
    return getAgentDir();
  } catch {
    // Fallback: ~/.pi/agent
    const home = process.env.HOME ?? ".";
    return join(home, ".pi", "agent");
  }
}

const LOG_DIR = join(getAgentDataDir(), "logs", "webTool");

/**
 * Ensure the log directory exists. Call this at session startup.
 */
function ensureLogDir(logDirectoryName: string, logTimestamp: string): string | undefined {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    mkdirSync(join(LOG_DIR, logDirectoryName), { recursive: true });

    const timestamp = logTimestamp.replace(/:/g, "-");
    const uuid = crypto.randomUUID();
    const fileName = `${timestamp}_${uuid}.jsonl`;
    const filePath = join(LOG_DIR, logDirectoryName, fileName);

    writeFileSync(filePath, "");
    return filePath;
  } catch {
    // Best-effort; if we can't create the dir, we fall back to stdout.
    console.error("Best-effort; if we can't create the dir, we fall back to stdout");
    return undefined;
  }
}

function logStartup(logDirectoryName: string, logTimestamp: string) {
  // 1. Ensure log directory exists and get file paths.
  //    ensureLogDir() returns undefined if mkdir fails, so we fall back to
  //    stdout (fd 1) to avoid crashing the extension.
  const filePath = ensureLogDir(logDirectoryName, logTimestamp);

  // 2. Build transport targets.
  //    Using pino.transport() with multiple targets is the recommended approach
  //    (per Pino maintainer) — targets run in worker threads, keeping the main
  //    thread free from I/O latency.
  //
  //    Level filtering (per-target):
  //    - Main file:  all logs at "info" and above.
  //    - Error file: only "error" and above (fatal).
  //    - Stdout:     all logs at "info" and above (for live debugging).
  //
  //    Why transports over multistream?
  //    - Transports = worker thread per target → no main-thread I/O overhead.
  //    - Multistream = in-thread writes → adds latency to every log call.
  //    - See: https://github.com/pinojs/pino/issues/1260
  transporter = transport({
    targets: [
      // Main log — all info+ messages.
      {
        target: "pino/file",
        options: { destination: filePath ?? 1 },
        level: "info",
      },
      // Error log — only error+ messages (error, fatal).
      {
        target: "pino/file",
        options: { destination: 2 },
        level: "error",
      },
    ],
  });
  // 3. Create the Pino logger instance.
  //    - level: "info" — debug logs are off by default (use "debug" to enable).
  //    - base: undefined — omits pid/name from every JSON line for cleaner output.
  //    - timestamp: isoTime — ISO-8601 timestamps for easy sorting/analysis.
  //    - serializers: stdSerializers.err — turns Error objects into a compact
  //      { type, message, stack } shape so the JSON stays valid.
  logger = pino(
    {
      level: "info",
      base: undefined,
      timestamp: pino.stdTimeFunctions.isoTime,
      serializers: {
        err: stdSerializers.err,
      },
    },
    transporter,
  );
}

async function logShutDown() {
  if (!transporter) return;
  // Wait for the transport to be ready, then flush all pending data.
  // Note: `ready` is a runtime getter on ThreadStream but missing from the .d.ts types,
  // so we just listen for the event unconditionally.
  await new Promise<void>((resolve) => {
    transporter!.once("ready", () => resolve());
  });
  transporter.flushSync();
  transporter.end();
  transporter = undefined;
  logger = undefined;
}
// ---------------------------------------------------------------------------
// Logger instance (singleton)
// ---------------------------------------------------------------------------

/**
 * Main logger instance.
 *
 * Provides the standard Pino levels:
 *   - debug(msg, ...args)
 *   - info(msg, ...args)
 *   - warn(msg, ...args)
 *   - error(msg, ...args)
 *
 * All methods accept an optional first argument with extra fields to include
 * in the JSON payload.
 *
 * Example:
 *   logger.info({ toolCallId: "abc123" }, "Tool executed in %dms", 42);
 */
// export const logger: Logger = pino(
//   {
//     level: "info",
//     formatters: {
//       level: (label) => ({ level: label.toUpperCase() }),
//     },
//     timestamp: pino.stdTimeFunctions.isoTime,
//     base: undefined, // omit pid/name for cleaner logs
//     serializers: {
//       err: stdSerializers.err, // Proper error serialization (stack, message, type)
//     },
//   },
//   multistream([
//     // Persistent file log — uses destination() for peak throughput.
//     // sync: false for performance in long-running processes (pi stays alive).
//     // See: https://github.com/pinojs/pino/blob/master/docs/api.md#pino-destination
//     {
//       stream: destination({ dest: LOG_FILE, sync: false, mkdir: true }),
//       level: "info",
//     },
//     // Also log to stdout/stderr for live debugging.
//     { stream: process.stdout, level: "info" },
//     { stream: process.stderr, level: "error" },
//   ]),
// );

export { logStartup, logShutDown, logger };
