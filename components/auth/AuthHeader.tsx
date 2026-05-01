import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { EdgeInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import { GymConfig } from "../../constants/GymConfig";

type Props = {
  gym: GymConfig;
  primary: string;
  insets: EdgeInsets;
  onBack?: () => void;
};

export function AuthHeader({ gym, primary, insets, onBack }: Props) {
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={primary} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      {gym.logoUrl ? (
        <Image source={{ uri: gym.logoUrl }} style={styles.logoImage} resizeMode="contain" />
      ) : (
        <Text style={[styles.brandName, { color: primary }]}>{gym.name.toUpperCase()}</Text>
      )}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: Colors.background,
  },
  spacer: { width: 34 },
  backButton: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: { height: 28, width: 120 },
  brandName: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
  },
});
