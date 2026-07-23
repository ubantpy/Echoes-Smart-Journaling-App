import { Text, View, StyleSheet } from "react-native";

export default function Insights() {
  return (
    <View style={styles.container}>
      <Text>Insights</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});