import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

const QUEUE_KEY = "homestead_offline_queue";

export interface QueuedMutation {
  id: string;
  timestamp: number;
  resource: string;
  action: "create" | "update" | "delete";
  data?: object;
  entityId?: string;
}

async function getQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveQueue(queue: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(mutation: Omit<QueuedMutation, "id" | "timestamp">): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  });
  await saveQueue(queue);
}

export async function flushQueue(onInvalidate?: () => void): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  const remaining: QueuedMutation[] = [];
  let flushed = false;

  for (const mutation of queue) {
    try {
      await executeMutation(mutation);
      flushed = true;
    } catch {
      remaining.push(mutation);
    }
  }

  await saveQueue(remaining);
  if (flushed) onInvalidate?.();
}

async function executeMutation(m: QueuedMutation): Promise<void> {
  switch (`${m.resource}:${m.action}`) {
    case "beds:create":     return void await api.beds.create(m.data!);
    case "beds:update":     return void await api.beds.update(m.entityId!, m.data!);
    case "beds:delete":     return void await api.beds.delete(m.entityId!);
    case "animals:create":  return void await api.animals.create(m.data!);
    case "animals:update":  return void await api.animals.update(m.entityId!, m.data!);
    case "animals:delete":  return void await api.animals.delete(m.entityId!);
    case "expenses:create": return void await api.finances.createExpense(m.data!);
    case "expenses:delete": return void await api.finances.deleteExpense(m.entityId!);
    case "income:create":   return void await api.finances.createIncome(m.data!);
    case "income:delete":   return void await api.finances.deleteIncome(m.entityId!);
    case "tasks:create":      return void await api.tasks.create(m.data!);
    case "tasks:update":      return void await api.tasks.update(m.entityId!, m.data!);
    case "tasks:delete":      return void await api.tasks.delete(m.entityId!);
    case "plantings:create":  return void await api.plantings.create(m.data!);
    case "plantings:update":  return void await api.plantings.update(m.entityId!, m.data!);
    case "plantings:delete":  return void await api.plantings.delete(m.entityId!);
    case "produce:create":    return void await api.produce.create(m.data!);
    case "inventory:create":  return void await api.inventory.create(m.data!);
    case "inventory:update":  return void await api.inventory.update(m.entityId!, m.data!);
    case "seeds:create":      return void await api.seeds.create(m.data!);
    case "seeds:update":      return void await api.seeds.update(m.entityId!, m.data!);
    default:
      throw new Error(`Unknown mutation: ${m.resource}:${m.action}`);
  }
}
