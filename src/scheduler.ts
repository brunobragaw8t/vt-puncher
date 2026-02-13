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
  const config = await getConfig();

  console.log(`Timezone: ${config.timezone}`);
  console.log("Schedule:");

  for (const p of config.punches) {
    const [hour, minute] = p.time.split(":").map(Number);
    const cronExpr = `${minute} ${hour} * * *`;

    console.log(`  ${p.type.toUpperCase().padEnd(3)} at ${p.time}`);

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

  console.log("\nRunning. Press Ctrl+C to stop.");

  process.on("SIGTERM", () => {
    console.log("Shutting down...");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("Shutting down...");
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Scheduler error:", error);
  process.exit(1);
});
