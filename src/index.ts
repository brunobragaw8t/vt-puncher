#!/usr/bin/env bun
import { program } from "commander";
import { spawn } from "child_process";
import { getStatus, login, punch } from "./api";
import { getCredentials, getState, updateState } from "./config";

program
  .name("vt")
  .description("VisualTime clock in/out automation")
  .version("1.0.0");

program
  .command("in")
  .description("Clock in now")
  .action(async () => {
    try {
      const credentials = getCredentials();
      console.log("Logging in...");
      const session = await login(credentials);
      console.log(`Logged in as: ${session.employeeName}`);

      console.log("Clocking in...");
      const result = await punch(session, credentials, "E");

      console.log(`Clocked in! Status: ${result.status}`);
      await updateState({
        lastPunch: { type: "in", timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error:", (error as Error).message);
      process.exit(1);
    }
  });

program
  .command("out")
  .description("Clock out now")
  .action(async () => {
    try {
      const credentials = getCredentials();
      console.log("Logging in...");
      const session = await login(credentials);
      console.log(`Logged in as: ${session.employeeName}`);

      console.log("Clocking out...");
      const result = await punch(session, credentials, "S");

      console.log(`Clocked out! Status: ${result.status}`);
      await updateState({
        lastPunch: { type: "out", timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error:", (error as Error).message);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show current punch status")
  .action(async () => {
    try {
      const credentials = getCredentials();
      const status = await getStatus(credentials);

      console.log(`Employee: ${status.employeeName}`);
      console.log(`Status: ${status.presenceStatus}`);
      const lastPunchStr = status.lastPunchDate
        ? status.lastPunchDate.toLocaleString()
        : "N/A";
      console.log(`Last punch: ${status.lastPunchDirection} at ${lastPunchStr}`);
    } catch (error) {
      console.error("Error:", (error as Error).message);
      process.exit(1);
    }
  });

const cron = program
  .command("cron")
  .description("Manage scheduled punches");

cron
  .command("start")
  .description("Start the scheduler daemon")
  .action(async () => {
    const state = await getState();

    if (state.schedulerPid) {
      // Check if process is actually running
      try {
        process.kill(state.schedulerPid, 0);
        console.log(`Scheduler already running (PID: ${state.schedulerPid})`);
        return;
      } catch {
        // Process not running, clean up stale PID
      }
    }

    const schedulerPath = new URL("./scheduler.ts", import.meta.url).pathname;

    const child = spawn("bun", ["run", schedulerPath], {
      detached: true,
      stdio: "ignore",
      env: process.env,
      cwd: process.cwd(),
    });

    child.unref();

    if (child.pid) {
      await updateState({ schedulerPid: child.pid });
      console.log(`Scheduler started (PID: ${child.pid})`);
    } else {
      console.error("Failed to start scheduler");
      process.exit(1);
    }
  });

cron
  .command("stop")
  .description("Stop the scheduler daemon")
  .action(async () => {
    const state = await getState();

    if (!state.schedulerPid) {
      console.log("Scheduler is not running");
      return;
    }

    try {
      process.kill(state.schedulerPid, "SIGTERM");
      console.log(`Scheduler stopped (PID: ${state.schedulerPid})`);
    } catch (error) {
      console.log("Scheduler was not running");
    }

    await updateState({ schedulerPid: undefined });
  });

cron
  .command("status")
  .description("Show scheduler status")
  .action(async () => {
    const state = await getState();

    if (!state.schedulerPid) {
      console.log("Scheduler: NOT RUNNING");
      return;
    }

    try {
      process.kill(state.schedulerPid, 0);
      console.log(`Scheduler: RUNNING (PID: ${state.schedulerPid})`);
    } catch {
      console.log("Scheduler: NOT RUNNING (stale PID)");
      await updateState({ schedulerPid: undefined });
    }

    if (state.lastPunch) {
      console.log(
        `Last auto-punch: ${state.lastPunch.type.toUpperCase()} at ${state.lastPunch.timestamp}`
      );
    }
  });

program.parse();
