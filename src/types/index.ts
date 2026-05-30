export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Homestead {
  id: string;
  name: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  hemisphere: "northern" | "southern";
  plan: "free" | "starter" | "homestead" | "farm";
  joinCode: string;
}

export interface Bed {
  id: string;
  name: string;
  width: number;
  height: number;
  color: string;
  notes?: string;
  plantings: Planting[];
}

export interface Planting {
  id: string;
  bedId: string;
  cropId: string;
  startDate: string;
  endDate?: string;
  status: "planned" | "growing" | "harvested" | "failed";
  crop: Crop;
}

export interface Crop {
  id: string;
  name: string;
  category: string;
  emoji?: string;
  description?: string;
  sowingMonths: number[];
  harvestMonths: number[];
  daysToHarvest?: number;
}

export interface Animal {
  id: string;
  name: string;
  species: string;
  breed?: string;
  sex?: string;
  dob?: string;
  tag?: string;
  color?: string;
  notes?: string;
  group?: AnimalGroup;
  medicalRecords?: MedicalRecord[];
  weightRecords?: WeightRecord[];
}

export interface AnimalGroup {
  id: string;
  name: string;
  species: string;
  color: string;
}

export interface MedicalRecord {
  id: string;
  type: string;
  description: string;
  date: string;
  veterinarian?: string;
  cost?: number;
  nextDue?: string;
  notes?: string;
}

export interface WeightRecord {
  id: string;
  weight: number;
  unit: string;
  date: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: "garden" | "animals" | "inventory" | "general";
  dueDate?: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  completedAt?: string;
  recurring?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  supplier?: string;
  notes?: string;
}

export interface IncomeRecord {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  buyer?: string;
  notes?: string;
}

export interface ProduceRecord {
  id: string;
  type: string;
  quantity: number;
  unit: string;
  date: string;
  quality?: string;
  notes?: string;
}

export interface HarvestRecord {
  id: string;
  cropName: string;
  quantity: number;
  unit: string;
  date: string;
  bedName?: string;
  notes?: string;
}

export interface SeedPacket {
  id: string;
  name: string;
  variety?: string;
  quantity: number;
  unit: "g" | "seeds" | "packets";
  expiryDate?: string;
  source?: string;
  germinationRate?: number;
  notes?: string;
  crop?: Pick<Crop, "id" | "name" | "category">;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity?: number;
  location?: string;
  supplier?: string;
  costPerUnit?: number;
  notes?: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Garden: undefined;
  Animals: undefined;
  Tasks: undefined;
  More: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Finances: undefined;
  Journal: undefined;
  Seeds: undefined;
  Inventory: undefined;
  Produce: undefined;
  Settings: undefined;
};
