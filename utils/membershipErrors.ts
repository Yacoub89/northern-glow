import { Alert } from "react-native";

export function isMembershipRequiredError(error: unknown): boolean {
  return error instanceof Error
    ? error.message.includes("An active membership is required")
    : false;
}

export function showMembershipRequiredAlert(router: { push: (href: "/membership") => void }) {
  Alert.alert(
    "Membership required",
    "You need an active membership before you can book or register. Please subscribe first.",
    [
      { text: "Not now", style: "cancel" },
      { text: "Subscribe", onPress: () => router.push("/membership") },
    ]
  );
}
