import { useAuthActions } from "@convex-dev/auth/react";
import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { useGymColors, useGymConfig } from "../../constants/GymConfig";

export default function RegisterScreen() {
  const { signIn } = useAuthActions();
  const { primary } = useGymColors();
  const gym = useGymConfig();

  // Step 1: registration fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 2: email verification
  const [step, setStep] = useState<"register" | "verify">("register");
  const [code, setCode] = useState("");
  const codeInputRef = useRef<TextInput>(null);

  // ─── Step 1: sign up ────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", {
        name: name.trim(),
        email: email.trim(),
        password,
        flow: "signUp",
      });
      // Verification email sent — show OTP input
      setStep("verify");
      setTimeout(() => codeInputRef.current?.focus(), 300);
    } catch (e: any) {
      Alert.alert("Sign Up Failed", e.message ?? "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: verify OTP ─────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", {
        email: email.trim(),
        code,
        flow: "email-verification",
      });
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Verification Failed", e.message ?? "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await signIn("password", {
        email: email.trim(),
        flow: "signUp",
        name: name.trim(),
        password,
      });
      Alert.alert("Code Resent", "A new verification code has been sent to your email.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not resend code");
    } finally {
      setLoading(false);
    }
  };

  // ─── Verify screen ──────────────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inner}>
          <Text style={[styles.logo, { color: primary }]}>{gym.name}</Text>
          <Text style={styles.tagline}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{"\n"}
            <Text style={styles.emailHighlight}>{email.trim()}</Text>
          </Text>

          <View style={styles.form}>
            <TextInput
              ref={codeInputRef}
              style={[styles.input, styles.codeInput]}
              placeholder="000000"
              placeholderTextColor={Colors.textMuted}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
            <Pressable
              style={[styles.button, { backgroundColor: primary }, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Verifying…" : "Verify & Continue"}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={handleResend} disabled={loading} style={styles.resendRow}>
            <Text style={styles.footerText}>Didn't receive it? </Text>
            <Text style={[styles.link, { color: primary }, loading && { opacity: 0.5 }]}>Resend code</Text>
          </Pressable>

          <Pressable onPress={() => setStep("register")} style={styles.backRow}>
            <Text style={[styles.link, { color: primary }]}>← Back</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── Register screen ────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={[styles.logo, { color: primary }]}>{gym.name}</Text>
        <Text style={styles.tagline}>Create your account</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
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
            placeholder="Password (min. 8 characters)"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Pressable
            style={[styles.button, { backgroundColor: primary }, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating Account…" : "Sign Up"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.link, { color: primary }]}>Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  logo: {
    fontSize: 52,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  emailHighlight: {
    color: Colors.text,
    fontWeight: "600",
  },
  form: { gap: 12 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeInput: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 12,
    paddingVertical: 18,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { color: Colors.textSecondary, fontSize: 15 },
  link: { fontSize: 15, fontWeight: "600" },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  backRow: {
    alignItems: "center",
    marginTop: 16,
  },
});
