import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://homestead-mocha.vercel.app/api";
const TOKEN_KEY = "homestead_mobile_token";

let _token: string | null = null;

export async function loadStoredToken() {
  _token = await AsyncStorage.getItem(TOKEN_KEY);
  return _token;
}

export async function saveToken(token: string) {
  _token = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  _token = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    mobileLogin: async (email: string, password: string) => {
      const data = await request<{ token: string; userId: string; name: string; email: string }>(
        "/auth/mobile-token",
        { method: "POST", body: JSON.stringify({ email, password }) }
      );
      await saveToken(data.token);
      return data;
    },
    register: (body: {
      name: string; email: string; password: string;
      homesteadName?: string; joinCode?: string; mode?: "join";
    }) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    session: () => request("/auth/session"),
  },

  homestead: {
    get: () => request("/homestead"),
    update: (data: object) => request("/homestead", { method: "PATCH", body: JSON.stringify(data) }),
    members: () => request("/homestead/members"),
    join: (joinCode: string, displayName?: string) =>
      request("/homestead/join", { method: "POST", body: JSON.stringify({ joinCode, displayName }) }),
  },

  beds: {
    list: () => request("/beds"),
    create: (data: object) => request("/beds", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request(`/beds/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/beds/${id}`, { method: "DELETE" }),
  },

  animals: {
    list: () => request("/animals"),
    create: (data: object) => request("/animals", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request(`/animals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/animals/${id}`, { method: "DELETE" }),
    addMedical: (animalId: string, data: object) =>
      request(`/animals/${animalId}/medical`, { method: "POST", body: JSON.stringify(data) }),
    addWeight: (animalId: string, data: object) =>
      request(`/animals/${animalId}/weight`, { method: "POST", body: JSON.stringify(data) }),
  },

  tasks: {
    list: () => request("/tasks"),
    create: (data: object) => request("/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/tasks/${id}`, { method: "DELETE" }),
    overdueCount: () => request<{ count: number }>("/tasks/overdue-count"),
  },

  finances: {
    expenses: () => request("/expenses"),
    createExpense: (data: object) => request("/expenses", { method: "POST", body: JSON.stringify(data) }),
    deleteExpense: (id: string) => request(`/expenses/${id}`, { method: "DELETE" }),
    income: () => request("/income"),
    createIncome: (data: object) => request("/income", { method: "POST", body: JSON.stringify(data) }),
    deleteIncome: (id: string) => request(`/income/${id}`, { method: "DELETE" }),
  },

  produce: {
    list: (days?: number) => request(`/produce${days ? `?days=${days}` : ""}`),
    create: (data: object) => request("/produce", { method: "POST", body: JSON.stringify(data) }),
  },

  harvest: {
    list: () => request("/harvest"),
    create: (data: object) => request("/harvest", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/harvest/${id}`, { method: "DELETE" }),
  },

  seeds: {
    list: () => request("/seeds"),
    create: (data: object) => request("/seeds", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request(`/seeds/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/seeds/${id}`, { method: "DELETE" }),
  },

  journal: {
    list: () => request("/journal"),
    create: (data: object) => request("/journal", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request(`/journal/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/journal/${id}`, { method: "DELETE" }),
  },

  inventory: {
    list: () => request("/inventory"),
    create: (data: object) => request("/inventory", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request(`/inventory/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/inventory/${id}`, { method: "DELETE" }),
  },

  crops: {
    list: () => request("/crops"),
  },

  plantings: {
    create: (data: object) => request("/beds", { method: "POST", body: JSON.stringify({ ...data, isPlanting: true }) }),
    update: (id: string, data: object) => request(`/plantings/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/plantings/${id}`, { method: "DELETE" }),
  },

  weather: {
    get: (lat: number, lon: number) => request(`/weather?lat=${lat}&lon=${lon}`),
  },

  receipts: {
    upload: async (localUri: string) => {
      const filename = localUri.split("/").pop() ?? "receipt.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : "image/jpeg";

      const formData = new FormData();
      formData.append("file", { uri: localUri, name: filename, type: mimeType } as any);

      const headers: Record<string, string> = { "Content-Type": "multipart/form-data" };
      if (_token) headers["Authorization"] = `Bearer ${_token}`;

      const res = await fetch(`${BASE_URL}/receipts/upload`, { method: "POST", headers, body: formData });
      if (!res.ok) throw new Error("Receipt upload failed");
      return res.json();
    },
  },
};
