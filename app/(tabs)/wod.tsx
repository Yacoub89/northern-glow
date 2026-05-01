import { useQuery } from "convex/react";
import { ActivityIndicator, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { useGymColors } from "../../constants/GymConfig";
import { wodStyles as s } from "../../components/wod/styles";
import { CoachWodTab } from "../../components/wod/CoachWodTab";
import { AthleteLogTab } from "../../components/wod/AthleteLogTab";

export default function WodScreen() {
  const me = useQuery(api.users.getMe);
  const { primary } = useGymColors();

  if (me === undefined) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  const isCoach = me?.role === "coach" || me?.role === "admin";
  return isCoach ? <CoachWodTab /> : <AthleteLogTab />;
}
