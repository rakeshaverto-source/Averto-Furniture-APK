// Talking to the Averto website. The sign-in token is kept in the phone's encrypted storage.
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

export const API_URL: string = Constants.expoConfig?.extra?.apiUrl ?? "";

const TOKEN_KEY = "averto.token";
const DRIVER_KEY = "averto.driver";

export interface Driver {
  name: string;
  phone?: string;
  vehicleNumber: string;
}

export interface DriverOrder {
  ref: string;
  status: "shipped" | "out_for_delivery";
  customerName: string;
  customerPhone: string;
  addressLines: string[];
  pincode: string;
  mapQuery: string;
  expectedDelivery: string | null; // yyyy-mm-dd
  deliverySlot: string;
  notes: string;
  items: { name: string; colorName: string | null; qty: number }[];
  cashToCollect: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export async function getSavedDriver(): Promise<Driver | null> {
  const saved = await SecureStore.getItemAsync(DRIVER_KEY);
  return saved ? JSON.parse(saved) : null;
}

async function request<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown; token?: string | null } = {}) {
  const token = init.token === undefined ? await getToken() : init.token;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError("No internet connection. Please try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong. Please try again.", res.status);
  return data as T;
}

export async function login(phone: string, pin: string) {
  const data = await request<{ token: string; driver: Driver }>("/api/driver/login", {
    body: { phone, pin },
    token: null,
  });
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  await SecureStore.setItemAsync(DRIVER_KEY, JSON.stringify(data.driver));
  return data.driver;
}

export async function logout() {
  await request("/api/driver/logout", { body: {} }).catch(() => undefined);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(DRIVER_KEY);
}

export const fetchOrders = () => request<{ driver: Driver; orders: DriverOrder[] }>("/api/driver/orders");

export const startDelivery = (ref: string) =>
  request(`/api/driver/orders/${encodeURIComponent(ref)}/start`, { body: {} });

export const markDelivered = (ref: string) =>
  request(`/api/driver/orders/${encodeURIComponent(ref)}/delivered`, { body: {} });

export const sendLocation = (ref: string, token: string, point: { lat: number; lng: number; at: number }) =>
  request(`/api/driver/orders/${encodeURIComponent(ref)}/location`, { body: point, token });
