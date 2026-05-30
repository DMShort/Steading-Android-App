import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { api } from "../../services/api";

type Mode = "create" | "join";

interface Props {
  onRegisterSuccess: () => void;
  onGoToLogin: () => void;
}

export function RegisterScreen({ onRegisterSuccess, onGoToLogin }: Props) {
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [homesteadName, setHomesteadName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name || !email || !password) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }
    if (mode === "create" && !homesteadName) {
      Alert.alert("Missing field", "Please give your homestead a name.");
      return;
    }
    if (mode === "join" && !joinCode) {
      Alert.alert("Missing field", "Please enter the join code.");
      return;
    }

    setLoading(true);
    try {
      const body =
        mode === "join"
          ? { mode: "join" as const, name, email, password, joinCode: joinCode.trim().toUpperCase() }
          : { name, email, password, homesteadName };

      await api.auth.register(body);
      // TODO: sign in after registration
      onRegisterSuccess();
    } catch (err: any) {
      Alert.alert("Registration failed", err.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Text style={styles.logoText}>🌱</Text>
        </View>
        <Text style={styles.title}>Get started</Text>
        <Text style={styles.subtitle}>Create a homestead or join one</Text>

        {/* Mode toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === "create" && styles.toggleBtnActive]}
            onPress={() => setMode("create")}
          >
            <Text style={[styles.toggleText, mode === "create" && styles.toggleTextActive]}>
              Create
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === "join" && styles.toggleBtnActive]}
            onPress={() => setMode("join")}
          >
            <Text style={[styles.toggleText, mode === "join" && styles.toggleTextActive]}>
              Join with code
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#a8a29e"
            autoComplete="name"
            value={name}
            onChangeText={setName}
          />

          {mode === "create" ? (
            <TextInput
              style={styles.input}
              placeholder="Homestead name (e.g. Green Acres)"
              placeholderTextColor="#a8a29e"
              value={homesteadName}
              onChangeText={setHomesteadName}
            />
          ) : (
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="Join code (e.g. CM4X7Z2A)"
              placeholderTextColor="#a8a29e"
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={t => setJoinCode(t.toUpperCase())}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#a8a29e"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 characters)"
            placeholderTextColor="#a8a29e"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />

          {mode === "join" && (
            <Text style={styles.hint}>
              Ask your homestead owner for the join code from Settings &amp; Members.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === "create" ? "Create Account" : "Join Homestead"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onGoToLogin}>
          <Text style={styles.link}>
            Already have an account?{" "}
            <Text style={styles.linkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9" },
  inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  logoText: { fontSize: 36 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1c1917",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#78716c",
    textAlign: "center",
    marginBottom: 24,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, color: "#78716c", fontWeight: "500" },
  toggleTextActive: { color: "#059669", fontWeight: "600" },
  form: { gap: 12, marginBottom: 24 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1c1917",
  },
  codeInput: { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", letterSpacing: 3 },
  hint: { fontSize: 12, color: "#a8a29e", textAlign: "center", marginTop: -4 },
  button: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#78716c", fontSize: 14 },
  linkBold: { color: "#059669", fontWeight: "600" },
});
