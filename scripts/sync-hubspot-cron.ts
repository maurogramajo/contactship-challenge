import { config } from "dotenv";
import { processNextPendingSyncTask } from "../lib/sync-tasks";

config({ path: ".env.local" });
config();

const ONE_MINUTE_MS = 60_000;

async function runOnce(trigger: "manual" | "startup" | "interval") {
  const startedAt = new Date();

  try {
    const result = await processNextPendingSyncTask();
    console.info(
      `[sync-hubspot-cron] trigger=${trigger} at=${startedAt.toISOString()} result=${JSON.stringify(result)}`,
    );
  } catch (error) {
    console.error(
      `[sync-hubspot-cron] trigger=${trigger} at=${startedAt.toISOString()} error=`,
      error,
    );
  }
}

async function runWatchMode() {
  console.info("[sync-hubspot-cron] local worker started");

  let running = false;

  const tick = async (trigger: "startup" | "interval") => {
    if (running) {
      console.warn("[sync-hubspot-cron] skipping tick because previous run is still active");
      return;
    }

    running = true;
    try {
      await runOnce(trigger);
    } finally {
      running = false;
    }
  };

  await tick("startup");

  const timer = setInterval(() => {
    void tick("interval");
  }, ONE_MINUTE_MS);

  const shutdown = (signal: string) => {
    clearInterval(timer);
    console.info(`[sync-hubspot-cron] stopping local worker (${signal})`);
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

const mode = process.argv.includes("--watch") ? "watch" : "once";

if (mode === "watch") {
  await runWatchMode();
} else {
  await runOnce("manual");
}
