#!/usr/bin/env bun
import cron from "node-cron";
import { login, punch } from "./api";
import { getConfig, getCredentials, updateState } from "./config";

async function executePunch(type: "in" | "out"): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Executing scheduled punch: ${type.toUpperCase()}`);

  try {
    const credentials = getCredentials();
    const session = await login(credentials);
    const direction = type === "in" ? "E" : "S";
    const result = await punch(session, credentials, direction);

    console.log(
      `[${timestamp}] Punch ${type.toUpperCase()} successful (status: ${result.status})`
    );
    await updateState({ lastPunch: { type, timestamp } });
  } catch (error) {
    console.error(`[${timestamp}] Punch error:`, (error as Error).message);
  }
}

async function main(): Promise<void> {
  console.log("Starting VT scheduler...");

  const config = await getConfig();
  console.log(`Timezone: ${config.timezone}`);
  console.log(`Workdays: ${config.workdays.join(", ")}`);

  // Schedule each punch
  for (const p of config.punches) {
    const [hour, minute] = p.time.split(":").map(Number);

    // Build cron expression: minute hour * * workdays
    // node-cron uses 0=Sunday, so we need to map
    // Our config: 1=Monday...7=Sunday
    // node-cron: 0=Sunday, 1=Monday...6=Saturday
    const cronDays = config.workdays
      .map((d) => (d === 7 ? 0 : d))
      .join(",");

    const cronExpr = `${minute} ${hour} * * ${cronDays}`;

    console.log(
      `Scheduled: ${p.type.toUpperCase()} at ${p.time} (cron: ${cronExpr})`
    );

    cron.schedule(
      cronExpr,
      () => {
        executePunch(p.type);
      },
      {
        timezone: config.timezone,
      }
    );
  }

  console.log("Scheduler running. Press Ctrl+C to stop.");

  // Keep process alive
  process.on("SIGTERM", () => {
    console.log("Received SIGTERM, shutting down...");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("Received SIGINT, shutting down...");
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Scheduler error:", error);
  process.exit(1);
});
