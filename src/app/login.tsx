import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { login } from "@/lib/api";
import { colors } from "@/lib/format";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await login(phone, pin);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.inner}>
        <Text style={styles.brand}>Averto</Text>
        <Text style={styles.subtitle}>Driver app</Text>

        <Text style={styles.label}>Mobile number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="98xxxxxxxx"
          placeholderTextColor={colors.muted}
          maxLength={15}
          style={styles.input}
        />

        <Text style={styles.label}>PIN</Text>
        <TextInput
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          placeholder="••••"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.pin]}
          onSubmitEditing={submit}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={busy || !phone || pin.length < 4}
          style={({ pressed }) => [styles.button, (busy || !phone || pin.length < 4) && styles.disabled, pressed && styles.pressed]}
        >
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>

        <Text style={styles.help}>Your PIN is given by the Averto office.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  brand: { fontSize: 40, fontWeight: "300", color: colors.ink, textAlign: "center" },
  subtitle: { fontSize: 16, color: colors.muted, textAlign: "center", marginBottom: 40 },
  label: { fontSize: 15, fontWeight: "600", color: colors.ink, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 18,
  },
  pin: { letterSpacing: 8 },
  error: { color: colors.red, fontSize: 15, marginBottom: 12 },
  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  disabled: { opacity: 0.5 },
  pressed: { backgroundColor: colors.accentDark },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: "600" },
  help: { color: colors.muted, fontSize: 14, textAlign: "center", marginTop: 20 },
});
