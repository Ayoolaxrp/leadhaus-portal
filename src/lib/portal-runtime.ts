import "server-only";
import type { User } from "./data/types";
import * as demo from "./portal";
import { isLiveRuntime } from "./data/runtime";
import { withPersistentStore } from "./supabase/persistent-store";

import { db } from "./data/store";

const localClientId = (user: User) => {
  if (user.role !== "client" || !user.clientId) throw new Error("A linked client profile is required.");
  return user.clientId;
};
const fromStore = <T>(user: User, reader: (clientId: string) => T): T | Promise<T> => {
  const id = localClientId(user);
  return isLiveRuntime() ? withPersistentStore(async () => reader(id)) : reader(id);
};
export const getAccount = (user: User) => fromStore(user, demo.getAccount);
export const getCampaigns = (user: User) => fromStore(user, demo.getCampaigns);
export const getPerformance = (user: User) => fromStore(user, demo.getPerformance);
export const getProjects = (user: User) => fromStore(user, demo.getProjects);
export const getCreatives = (user: User) => fromStore(user, demo.getCreatives);
export const getStrategy = (user: User) => fromStore(user, demo.getStrategy);
export const getReports = (user: User) => fromStore(user, demo.getReports);
export const getOnboarding = (user: User) => fromStore(user, demo.getOnboarding);
export const getDocuments = (user: User) => fromStore(user, demo.getDocuments);
export const getMessages = (user: User) => fromStore(user, demo.getMessages);
export const getTasks = (user: User) => fromStore(user, demo.getTasks);
export const getInvoices = (user: User) => fromStore(user, demo.getInvoices);
export const getInvoice = (user: User, id: string) => fromStore(user, (clientId) => demo.getInvoice(clientId, id));
export const getDocument = (user: User, id: string) => fromStore(user, (clientId) => demo.getDocument(clientId, id));
export const getAgencyInfo = () => isLiveRuntime() ? withPersistentStore(async () => ({ ...db.settings, bank: { ...db.settings.bank } })) : demo.getAgencyInfo();
