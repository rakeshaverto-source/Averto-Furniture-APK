import { useCallback, useState } from "react";
import { Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { ApiError, fetchOrders, getToken, logout, type Driver, type DriverOrder } from "@/lib/api";
import { stopTrackingEverything, syncTracking } from "@/lib/tracking";
import { colors, deliveryDay, rupees } from "@/lib/format";

export default function OrdersScreen() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<DriverOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsPermission, setNeedsPermission] = useState(false);

  const load = useCallback(async () => {
    if (!(await getToken())) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrders();
      setDriver(data.driver);
      setOrders(data.orders);
      // Keep sharing location for whatever is out for delivery, e.g. after the phone restarted
      const ok = await syncTracking(data.orders.filter((o) => o.status === "out_for_delivery").map((o) => o.ref));
      setNeedsPermission(!ok);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await stopTrackingEverything();
        await logout();
        router.replace("/login");
        return;
      }
      setError(e instanceof Error ? e.message : "Could not load deliveries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmLogout() {
    Alert.alert("Sign out?", "Location sharing will stop.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await stopTrackingEverything();
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <View style={styles.page}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={confirmLogout} hitSlop={12}>
              <Text style={styles.headerLink}>Sign out</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={orders ?? []}
        keyExtractor={(o) => o.ref}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[colors.accent]} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {driver && (
              <Text style={styles.hello}>
                Hello {driver.name.split(" ")[0]}
                {driver.vehicleNumber ? ` · ${driver.vehicleNumber}` : ""}
              </Text>
            )}
            {needsPermission && (
              <Pressable style={styles.warning} onPress={() => Linking.openSettings()}>
                <Text style={styles.warningTitle}>Location is off for a delivery</Text>
                <Text style={styles.warningText}>
                  Tap here, open Permissions → Location and choose &quot;Allow all the time&quot;.
                </Text>
              </Pressable>
            )}
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          orders && !error ? <Text style={styles.empty}>No deliveries right now. Pull down to refresh.</Text> : undefined
        }
        ListFooterComponent={<BatteryTip />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/order/[ref]", params: { ref: item.ref } })}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.ref}>{item.ref}</Text>
              {item.status === "out_for_delivery" ? (
                <Text style={[styles.badge, styles.badgeLive]}>On the way</Text>
              ) : (
                <Text style={styles.badge}>Ready</Text>
              )}
            </View>
            <Text style={styles.name}>{item.customerName}</Text>
            <Text style={styles.address} numberOfLines={2}>
              {item.addressLines.join(", ")}
            </Text>
            {(item.expectedDelivery || item.deliverySlot) && (
              <Text style={styles.when}>
                {[deliveryDay(item.expectedDelivery), item.deliverySlot].filter(Boolean).join(", ")}
              </Text>
            )}
            {item.cashToCollect > 0 && <Text style={styles.cash}>Collect {rupees(item.cashToCollect)}</Text>}
          </Pressable>
        )}
      />
    </View>
  );
}

// Phones from Xiaomi, Vivo, Oppo, Realme and others stop apps in the background to save battery
function BatteryTip() {
  return (
    <View style={styles.tip}>
      <Text style={styles.tipTitle}>Location stopping when the phone is locked?</Text>
      <Text style={styles.tipText}>
        Open the app settings and set Battery to &quot;Unrestricted&quot; (or &quot;No restrictions&quot;), and Location to
        &quot;Allow all the time&quot;.
      </Text>
      <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
        <Text style={styles.tipLink}>Open app settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  headerLink: { color: colors.muted, fontSize: 15 },
  hello: { fontSize: 15, color: colors.muted, marginBottom: 8 },
  warning: { backgroundColor: colors.amberBg, borderRadius: 12, padding: 14, marginBottom: 8 },
  warningTitle: { color: colors.amber, fontWeight: "700", fontSize: 15 },
  warningText: { color: colors.amber, fontSize: 14, marginTop: 4 },
  error: { color: colors.red, fontSize: 15, marginBottom: 8 },
  empty: { textAlign: "center", color: colors.muted, fontSize: 16, marginTop: 60 },
  card: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16 },
  cardPressed: { borderColor: colors.ink },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ref: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    backgroundColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  badgeLive: { backgroundColor: colors.greenBg, color: colors.green },
  name: { fontSize: 18, fontWeight: "600", color: colors.ink, marginTop: 6 },
  address: { fontSize: 15, color: colors.muted, marginTop: 2 },
  when: { fontSize: 15, color: colors.ink, marginTop: 8, fontWeight: "500" },
  cash: { fontSize: 15, color: colors.accentDark, marginTop: 4, fontWeight: "700" },
  tip: { marginTop: 24, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  tipTitle: { fontSize: 14, fontWeight: "600", color: colors.ink },
  tipText: { fontSize: 14, color: colors.muted, marginTop: 4 },
  tipLink: { fontSize: 14, color: colors.accentDark, fontWeight: "600", marginTop: 8 },
});
