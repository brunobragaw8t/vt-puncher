import { file } from "bun";
import type { Config, Credentials, State } from "./types";

import { dirname, resolve } from "path";

const PROJECT_DIR = resolve(dirname(new URL(import.meta.url).pathname), "..");
const CONFIG_PATH = resolve(PROJECT_DIR, "config.json");
const STATE_PATH = resolve(PROJECT_DIR, "state.json");

export function getCredentials(): Credentials {
  const user = process.env.VT_USER;
  const password = process.env.VT_PASSWORD;
  const companyId = process.env.VT_COMPANY_ID;

  if (!user || !password || !companyId) {
    throw new Error(
      "Missing VT_USER, VT_PASSWORD, or VT_COMPANY_ID in environment"
    );
  }

  return { user, password, companyId };
}

export async function getConfig(): Promise<Config> {
  const configFile = file(CONFIG_PATH);

  if (!(await configFile.exists())) {
    throw new Error(
      `Config file not found: ${CONFIG_PATH}\nCopy config.example.json to config.json and edit it.`
    );
  }

  return configFile.json();
}

export async function getState(): Promise<State> {
  const stateFile = file(STATE_PATH);

  if (!(await stateFile.exists())) {
    return {};
  }

  return stateFile.json();
}

export async function saveState(state: State): Promise<void> {
  await Bun.write(STATE_PATH, JSON.stringify(state, null, 2));
}

export async function updateState(
  updates: Partial<State>
): Promise<State> {
  const current = await getState();
  const newState = { ...current, ...updates };
  await saveState(newState);
  return newState;
}
