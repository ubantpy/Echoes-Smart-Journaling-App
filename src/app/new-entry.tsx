import { Text, View, StyleSheet } from "react-native";

export default function NewEntry() {
  return (
    <View style={styles.container}>
      <Text>New Entry</Text>
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