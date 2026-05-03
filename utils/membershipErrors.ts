import type { AppDialogAction } from "../components/AppDialog";

export function isMembershipRequiredError(error: unknown): boolean {
  return error instanceof Error
    ? error.message.includes("An active membership is required")
    : false;
}

export function showMembershipRequiredAlert(
  dialog: {
    alert: (title: string, message?: string, actions?: AppDialogAction[]) => void;
  },
  router: { push: (href: "/membership") => void }
) {
  dialog.alert(
    "Membership required",
    "You need an active membership before you can book or register. Please subscribe first.",
    [
      { text: "Not now", style: "cancel" },
      { text: "Subscribe", onPress: () => router.push("/membership") },
    ]
  );
}
