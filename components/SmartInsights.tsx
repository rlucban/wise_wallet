import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text, IconButton, Button } from "react-native-paper";
import { useInsights, Insight } from "../hooks/useInsights";

export function SmartInsights() {
  const { insights } = useInsights();
  const [dismissedIds, setDismissedIds] = React.useState<string[]>([]);
  const [showDismissed, setShowDismissed] = React.useState(false);

  if (insights.length === 0) return null;

  const activeInsights = insights.filter(i => !dismissedIds.includes(i.id));
  const displayInsights = showDismissed ? insights : activeInsights;

  if (displayInsights.length === 0 && !showDismissed) {
    if (dismissedIds.length > 0) {
      return (
        <View style={styles.container}>
          <Button mode="text" onPress={() => setShowDismissed(true)}>View Dismissed Insights ({dismissedIds.length})</Button>
        </View>
      );
    }
    return null;
  }

  const getTypeStyles = (type: Insight["type"]) => {
    switch (type) {
      case "danger":
        return { 
            bg: "#FEE2E2", 
            text: "#991B1B", 
            icon: "alert-octagon",
            iconColor: "#B91C1C" 
        };
      case "warning":
        return { 
            bg: "#FEF3C7", 
            text: "#92400E", 
            icon: "alert",
            iconColor: "#D97706" 
        };
      case "success":
        return { 
            bg: "#D1FAE5", 
            text: "#065F46", 
            icon: "check-circle",
            iconColor: "#059669" 
        };
      default:
        return { 
            bg: "#DBEAFE", 
            text: "#1E40AF", 
            icon: "information",
            iconColor: "#2563EB" 
        };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerText}>Smart Insights</Text>
        <IconButton 
          icon={showDismissed ? "eye-off-outline" : "history"} 
          size={20} 
          onPress={() => setShowDismissed(!showDismissed)}
        />
      </View>
      
      {displayInsights.map((insight) => {
        const styles_type = getTypeStyles(insight.type);
        return (
          <Card key={insight.id} style={[styles.card, { backgroundColor: styles_type.bg }]} elevation={0}>
            <Card.Content style={styles.cardContent}>
              <IconButton icon={styles_type.icon} iconColor={styles_type.iconColor} size={24} style={styles.icon} />
              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: styles_type.text }]}>{insight.title}</Text>
                <Text style={[styles.message, { color: styles_type.text }]}>{insight.message}</Text>
              </View>
              {!showDismissed && (
                <IconButton 
                  icon="close" 
                  size={16} 
                  iconColor={styles_type.text}
                  onPress={() => setDismissedIds([...dismissedIds, insight.id])}
                />
              )}
            </Card.Content>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerText: {
    fontWeight: "700",
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  icon: {
    margin: 0,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.9,
  },
});
