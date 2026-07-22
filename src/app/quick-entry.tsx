import { Text, View, StyleSheet } from "react-native";

export default function QuickEntry() {
  return (
    <View style={styles.container}>
      <Text>Quick Entry</Text>
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