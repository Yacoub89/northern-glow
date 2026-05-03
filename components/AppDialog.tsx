import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/Colors";
import { useGymColors } from "../constants/GymConfig";
import { Fonts, FontSizes } from "../constants/Typography";

export type AppDialogAction = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
};

type AppDialogOptions = {
  title: string;
  message?: string;
  actions?: AppDialogAction[];
};

type AppDialogContextValue = {
  alert: (title: string, message?: string, actions?: AppDialogAction[]) => void;
  confirm: (options: {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const { primary } = useGymColors();
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);

  const close = () => setDialog(null);

  const value = useMemo<AppDialogContextValue>(
    () => ({
      alert: (title, message, actions) => {
        setDialog({
          title,
          message,
          actions: actions?.length ? actions : [{ text: "OK" }],
        });
      },
      confirm: ({ title, message, confirmText = "OK", cancelText = "Cancel", destructive = false }) =>
        new Promise((resolve) => {
          setDialog({
            title,
            message,
            actions: [
              { text: cancelText, style: "cancel", onPress: () => resolve(false) },
              {
                text: confirmText,
                style: destructive ? "destructive" : "default",
                onPress: () => resolve(true),
              },
            ],
          });
        }),
    }),
    []
  );

  const actions = dialog?.actions?.length ? dialog.actions : [{ text: "OK" }];
  const handleAction = async (action: AppDialogAction) => {
    close();
    await action.onPress?.();
  };
  const handleRequestClose = () => {
    const cancelAction = actions.find((action) => action.style === "cancel");
    void handleAction(cancelAction ?? actions[0]);
  };

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleRequestClose}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>{dialog?.title}</Text>
            {dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
            <View style={styles.actions}>
              {actions.map((action, index) => {
                const isPrimary = action.style !== "cancel" && action.style !== "destructive";
                const isDestructive = action.style === "destructive";
                return (
                  <Pressable
                    key={`${action.text}-${index}`}
                    style={[
                      styles.button,
                      isPrimary && { backgroundColor: primary, borderColor: primary },
                      isDestructive && styles.destructiveButton,
                    ]}
                    onPress={() => {
                      void handleAction(action);
                    }}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isPrimary && styles.primaryButtonText,
                        isDestructive && styles.destructiveButtonText,
                      ]}
                    >
                      {action.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const dialog = useContext(AppDialogContext);
  if (!dialog) {
    throw new Error("useAppDialog must be used inside AppDialogProvider");
  }
  return dialog;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4, 19, 41, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display,
    fontSize: FontSizes.titleLg,
    marginBottom: 8,
  },
  message: {
    color: Colors.textSecondary,
    fontFamily: Fonts.body,
    fontSize: FontSizes.labelLg,
    lineHeight: 21,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  buttonText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelLg,
    textAlign: "center",
  },
  primaryButtonText: {
    color: Colors.onPrimary,
  },
  destructiveButton: {
    backgroundColor: "rgba(255, 180, 171, 0.14)",
    borderColor: "rgba(255, 180, 171, 0.35)",
  },
  destructiveButtonText: {
    color: Colors.error,
  },
});
