import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const storePath = join(__dirname, 'data', 'store.json');

const initialStore = {
  family: { id: 'family-local', name: 'Family', profiles: [] },
  plans: [],
  activities: [],
  symptoms: [],
  mealRatings: [],
  aiRequests: []
};

export async function readStore() {
  try {
    return JSON.parse(await readFile(storePath, 'utf8'));
  } catch {
    await writeStore(initialStore);
    return structuredClone(initialStore);
  }
}

export async function writeStore(store) {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`);
  return store;
}

export async function updateStore(updater) {
  const store = await readStore();
  const next = await updater(store);
  await writeStore(next || store);
  return next || store;
}
