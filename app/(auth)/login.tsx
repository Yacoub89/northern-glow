import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import { useGymColors, useGymConfig } from "../../constants/GymConfig";
import { AuthHeader } from "../../components/auth/AuthHeader";

export default function LoginScreen() {
  const gym = useGymConfig();
  const { primary } = useGymColors();
  const { signIn } = useAuthActions();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", { email: email.trim(), password, flow: "signIn" });
      // Navigation is handled automatically by (auth)/_layout.tsx once
      // isAuthenticated becomes true. Do NOT call router.replace here —
      // it fires before the Convex client processes the token, so the
      // TabsLayout sees isAuthenticated=false and redirects back to login.
    } catch (e: any) {
      Alert.alert("Login Failed", e.message ?? "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <AuthHeader gym={gym} primary={primary} insets={insets} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Sign In</Text>
        {gym.tagline ? (
          <Text style={styles.tagline}>{gym.tagline}</Text>
        ) : null}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Pressable
            style={[styles.button, { backgroundColor: primary }, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing in…" : "Sign In"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={[styles.link, { color: primary }]}>Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    justifyContent: "center",
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.text,
    marginBottom: 28,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: -20,
    marginBottom: 28,
    letterSpacing: 0.5,
  },
  form: { gap: 12 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 15 },
  link: { fontSize: 15, fontFamily: Fonts.bodySemi },
});
