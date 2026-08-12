import { useEffect } from "react";
import { Text, StyleSheet, Animated } from "react-native";
import { colors, fonts } from "../constants/theme";

interface OfflineBannerProps {
  message: string;
  /** Auto-dismiss after this many ms. Default 3500. Pass 0 to stay until unmounted */
  duration?: number;
  onDismiss?: () => void;
}

/**
 * Slides down from the top of the screen to show a short offline/error message.
 * Auto-dismisses after "duration" ms.
 */
export function OfflineBanner({ message, duration = 3500, onDismiss }: OfflineBannerProps) {
  const translateY = new Animated.Value(-80);

  useEffect(() => {
    // Slide in
    Animated.timing(translateY, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();

    if (duration <= 0) return;

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -80,
        duration: 240,
        useNativeDriver: true,
      }).start(() => onDismiss?.());
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#2e3530",
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 24,
    zIndex: 999,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
});