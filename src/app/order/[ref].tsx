import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ApiError, fetchOrders, markDelivered, startDelivery, type DriverOrder } from "@/lib/api";
import { askLocationPermission, startTracking, stopTracking } from "@/lib/tracking";
import { colors, deliveryDay, rupees } from "@/lib/format";

export default function OrderScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await fetchOrders();
      const found = data.orders.find((o) => o.ref === ref) ?? null;
      setOrder(found);
      if (!found) setError("This delivery is no longer assigned to you.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace("/login");
      else setError(e instanceof Error ? e.message : "Could not load this delivery.");
    } finally {
      setLoading(false);
    }
  }, [ref]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Explain first, because Android sends the driver to a settings page for "Allow all the time"
  function confirmStart() {
    Alert.alert(
      "Start delivery?",
      "The customer will see your location on the map until you mark it delivered.\n\nOn the next screens, allow location and choose \"Allow all the time\", so it keeps working when the phone is locked.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Start", onPress: start },
      ],
    );
  }

  async function start() {
    if (!order) return;
    setBusy(true);
    try {
      const permission = await askLocationPermission();
      if (permission === "no-foreground") {
        Alert.alert("Location needed", "Please allow location so the customer can see where you are.", [
          { text: "Open settings", onPress: () => Linking.openSettings() },
          { text: "OK" },
        ]);
        return;
      }
      await startDelivery(order.ref);
      if (permission === "granted") await startTracking(order.ref);
      else {
        Alert.alert(
          "Location only while the app is open",
          "Choose \"Allow all the time\" in settings so the customer can still see you when the phone is locked.",
          [{ text: "Open settings", onPress: () => Linking.openSettings() }, { text: "Later" }],
        );
      }
      await load();
    } catch (e) {
      Alert.alert("Could not start", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function confirmDelivered() {
    if (!order) return;
    const cash = order.cashToCollect > 0 ? `\n\nDid you collect ${rupees(order.cashToCollect)}?` : "";
    Alert.alert("Mark as delivered?", `${order.customerName} has received the order.${cash}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delivered", onPress: delivered },
    ]);
  }

  async function delivered() {
    if (!order) return;
    setBusy(true);
    try {
      await markDelivered(order.ref);
      await stopTracking(order.ref);
      Alert.alert("Delivered", "Thank you! Location sharing has stopped.");
      router.back();
    } catch (e) {
      Alert.alert("Could not update", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => router.back()} style={styles.secondary}>
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const live = order.status === "out_for_delivery";

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: order.ref }} />

      {live && (
        <View style={styles.liveBox}>
          <Text style={styles.liveText}>● Sharing your location with the customer</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.name}>{order.customerName}</Text>
        {order.addressLines.map((line) => (
          <Text key={line} style={styles.address}>
            {line}
          </Text>
        ))}
        {(order.expectedDelivery || order.deliverySlot) && (
          <Text style={styles.when}>{[deliveryDay(order.expectedDelivery), order.deliverySlot].filter(Boolean).join(", ")}</Text>
        )}

        <View style={styles.row}>
          <Pressable style={styles.secondary} onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}>
            <Text style={styles.secondaryText}>📞 Call</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.mapQuery)}`)
            }
          >
            <Text style={styles.secondaryText}>🧭 Navigate</Text>
          </Pressable>
        </View>
      </View>

      {order.cashToCollect > 0 && (
        <View style={[styles.card, styles.cashCard]}>
          <Text style={styles.cashLabel}>Collect from customer</Text>
          <Text style={styles.cash}>{rupees(order.cashToCollect)}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.heading}>Items</Text>
        {order.items.map((item, i) => (
          <Text key={i} style={styles.item}>
            {item.qty} × {item.name}
            {item.colorName ? ` (${item.colorName})` : ""}
          </Text>
        ))}
        {!!order.notes && (
          <>
            <Text style={[styles.heading, styles.spaced]}>Customer note</Text>
            <Text style={styles.item}>{order.notes}</Text>
          </>
        )}
      </View>

      {busy ? (
        <ActivityIndicator color={colors.accent} size="large" style={styles.spaced} />
      ) : live ? (
        <Pressable style={[styles.primary, styles.done]} onPress={confirmDelivered}>
          <Text style={styles.primaryText}>✓ Delivered</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.primary} onPress={confirmStart}>
          <Text style={styles.primaryText}>▶ Start delivery</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  error: { color: colors.red, fontSize: 16, textAlign: "center" },
  liveBox: { backgroundColor: colors.greenBg, borderRadius: 12, padding: 12 },
  liveText: { color: colors.green, fontWeight: "600", fontSize: 15 },
  card: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16 },
  name: { fontSize: 20, fontWeight: "600", color: colors.ink, marginBottom: 4 },
  address: { fontSize: 16, color: colors.ink, lineHeight: 22 },
  when: { fontSize: 16, fontWeight: "600", color: colors.accentDark, marginTop: 10 },
  row: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  secondaryText: { fontSize: 16, fontWeight: "600", color: colors.ink },
  cashCard: { backgroundColor: colors.amberBg, borderColor: colors.amberBg },
  cashLabel: { fontSize: 14, color: colors.amber },
  cash: { fontSize: 26, fontWeight: "700", color: colors.amber, marginTop: 2 },
  heading: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginBottom: 6 },
  item: { fontSize: 16, color: colors.ink, lineHeight: 24 },
  spaced: { marginTop: 16 },
  primary: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 18, alignItems: "center", marginTop: 8 },
  done: { backgroundColor: colors.green },
  primaryText: { color: colors.white, fontSize: 18, fontWeight: "700" },
});
