import { Platform, type TextStyle } from "react-native";

export const fieldLabel: TextStyle = {
  color: "#666",
  fontSize: 13,
  fontWeight: "600",
  marginTop: 4,
  marginBottom: 6,
};

export function readOnlyInputProps(): {
  editable: false;
  caretHidden: true;
  tabIndex?: number;
} {
  if (Platform.OS === "web") {
    return { editable: false, caretHidden: true, tabIndex: -1 };
  }
  return { editable: false, caretHidden: true };
}
