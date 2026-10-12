import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { db, emptyStore, type Store } from "@/lib/data/store";
import { createServiceSupabaseClient } from "./admin";

const requestState = new AsyncLocalStorage<{ store: Store; revision: number }>();
const requestStore = new AsyncLocalStorage<Store>();
const isolatedState = new AsyncLocalStorage<Store>();
export const stateProxy = new Proxy(db, {
  get(target, key, receiver) { return Reflect.get(requestStore.getStore() ?? target, key, receiver); },
  set(target, key, value, receiver) { return Reflect.set(requestStore.getStore() ?? target, key, value, receiver); },
});

function decodeState(value: unknown): Store {
  if (!value || typeof value !== "object") throw new Error("Persistent app state is not initialized.");
  const candidate = value as Partial<Store>;
  const blank = emptyStore();
  for (const key of Object.keys(blank) as (keyof Store)[]) {
    if (candidate[key] === undefined || candidate[key] === null) throw new Error(`Persistent app state is missing ${key}.`);
  }
  return { ...blank, ...candidate } as Store;
}

async function fetchState() {
  const client = createServiceSupabaseClient();
  const { data, error } = await client.from("leadhaus_app_state").select("revision,state").eq("id", true).single();
  if (error || !data) throw new Error(`Could not load persistent app state: ${error?.message ?? "state row missing"}`);
  return { store: decodeState(data.state), revision: Number(data.revision) };
}

export async function withPersistentStore<T>(work: () => Promise<T> | T): Promise<T> {
  const state = await fetchState();
  return requestState.run(state, () => requestStore.run(state.store, () => work()));
}

export async function withPersistentStoreSnapshot<T>(work: (store: Store) => Promise<T> | T): Promise<T> {
  const state = await fetchState();
  return isolatedState.run(state.store, () => work(state.store));
}

export async function adminDataSnapshot(): Promise<Store> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in is required.");
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (error || profile?.role !== "admin") throw new Error("Staff access is required.");
  return (await fetchState()).store;
}

export async function savePersistentStore(): Promise<void> {
  const request = requestState.getStore();
  if (!request) throw new Error("Persistent request context missing; no changes were saved.");
  const client = createServiceSupabaseClient();
  const nextRevision = request.revision + 1;
  const { data, error } = await client
    .from("leadhaus_app_state")
    .update({ state: request.store, revision: nextRevision, updated_at: new Date().toISOString() })
    .eq("id", true)
    .eq("revision", request.revision)
    .select("revision")
    .maybeSingle();
  if (error) throw new Error(`Could not save changes: ${error.message}`);
  if (!data) throw new Error("Another team member saved at the same time. Reload and try again.");
  request.revision = nextRevision;
}

export async function loadPersistentStore(): Promise<Store> {
  const { store } = await fetchState();
  return store;
}

