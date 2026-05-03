import { useAuthActions } from "@convex-dev/auth/react";
import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import {
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
import { useAppDialog } from "../../components/AppDialog";

export default function RegisterScreen() {
  const { signIn } = useAuthActions();
  const { primary } = useGymColors();
  const gym = useGymConfig();
  const dialog = useAppDialog();
  const insets = useSafeAreaInsets();

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
      dialog.alert("Error", "Please fill in all fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      dialog.alert("Error", "Please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      dialog.alert("Error", "Password must be at least 8 characters");
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
      dialog.alert("Sign Up Failed", e.message ?? "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: verify OTP ─────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (code.length !== 6) {
      dialog.alert("Error", "Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", {
        email: email.trim(),
        code,
        flow: "email-verification",
      });
    } catch (e: any) {
      dialog.alert("Verification Failed", e.message ?? "Invalid or expired code");
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
      dialog.alert("Code Resent", "A new verification code has been sent to your email.");
    } catch (e: any) {
      dialog.alert("Error", e.message ?? "Could not resend code");
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
        <AuthHeader gym={gym} primary={primary} insets={insets} onBack={() => setStep("register")} />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Check your email</Text>
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
            <Text style={[styles.link, { color: primary }, loading && { opacity: 0.5 }]}>
              Resend code
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Register screen ────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <AuthHeader gym={gym} primary={primary} insets={insets} onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create Account</Text>

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
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: -16,
    marginBottom: 28,
    lineHeight: 22,
  },
  emailHighlight: {
    fontFamily: Fonts.bodySemi,
    color: Colors.text,
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
  codeInput: {
    fontFamily: Fonts.display,
    fontSize: 28,
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
  buttonText: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 15 },
  link: { fontSize: 15, fontFamily: Fonts.bodySemi },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
});
