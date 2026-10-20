// Background location: while any order is out for delivery, Android runs a foreground service (the
// "Delivery in progress" notification) and hands us the position even with the screen locked. Each
// position is sent for every order being delivered; the website keeps only the latest.
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { ApiError, getToken, sendLocation } from "./api";

export const LOCATION_TASK = "averto-delivery-location";
const REFS_KEY = "averto.trackedRefs";

export async function trackedRefs(): Promise<string[]> {
  const saved = await SecureStore.getItemAsync(REFS_KEY);
  return saved ? JSON.parse(saved) : [];
}

const saveRefs = (refs: string[]) => SecureStore.setItemAsync(REFS_KEY, JSON.stringify(refs));

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const latest = data.locations[data.locations.length - 1];
  const [token, refs] = await Promise.all([getToken(), trackedRefs()]);
  if (!token || refs.length === 0) {
    await stopAll();
    return;
  }
  const point = { lat: latest.coords.latitude, lng: latest.coords.longitude, at: latest.timestamp };
  const finished: string[] = [];
  await Promise.all(
    refs.map((ref) =>
      sendLocation(ref, token, point).catch((e) => {
        // 409: delivered or cancelled from the office; 404: given to another driver; 401: signed out
        if (e instanceof ApiError && [401, 404, 409].includes(e.status)) finished.push(ref);
      }),
    ),
  );
  if (finished.length) {
    const left = refs.filter((r) => !finished.includes(r));
    await saveRefs(left);
    if (left.length === 0) await stopAll();
  }
});

export type PermissionResult = "granted" | "no-foreground" | "no-background";

// Asks for "While using the app" first, then "Allow all the time" (Android opens its settings page for that)
export async function askLocationPermission(): Promise<PermissionResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return "no-foreground";
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === "granted" ? "granted" : "no-background";
}

export async function hasBackgroundPermission() {
  const [fg, bg] = await Promise.all([Location.getForegroundPermissionsAsync(), Location.getBackgroundPermissionsAsync()]);
  return fg.status === "granted" && bg.status === "granted";
}

async function ensureRunning() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30_000,
    distanceInterval: 30,
    foregroundService: {
      notificationTitle: "Delivery in progress",
      notificationBody: "Averto is sharing your location with the customer.",
      notificationColor: "#E08A50",
      killServiceOnDestroy: false,
    },
  });
}

async function stopAll() {
  await saveRefs([]);
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export async function startTracking(ref: string) {
  const refs = await trackedRefs();
  if (!refs.includes(ref)) await saveRefs([...refs, ref]);
  await ensureRunning();
}

export async function stopTracking(ref: string) {
  const left = (await trackedRefs()).filter((r) => r !== ref);
  if (left.length === 0) await stopAll();
  else await saveRefs(left);
}

// Makes tracking match the orders the website says are out for delivery, e.g. after the phone
// restarted or the office changed something. Returns false if permission is missing.
export async function syncTracking(outForDelivery: string[]) {
  if (outForDelivery.length === 0) {
    await stopAll();
    return true;
  }
  await saveRefs(outForDelivery);
  if (!(await hasBackgroundPermission())) return false;
  await ensureRunning();
  return true;
}

export const stopTrackingEverything = stopAll;
