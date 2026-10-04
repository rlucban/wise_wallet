import React from "react";
import { Modal, Pressable, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

interface CenteredDialogModalProps {
    visible: boolean;
    onDismiss: () => void;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export default function CenteredDialogModal({ visible, onDismiss, children, style }: CenteredDialogModalProps) {
    const theme = useTheme();

    return (
        <Modal
            visible={visible}
            onRequestClose={onDismiss}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <Pressable
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    padding: 16,
                }}
                onPress={onDismiss}
            >
                <Pressable
                    onPress={() => {}}
                    style={[
                        {
                            backgroundColor: theme.colors.surface,
                            borderRadius: 16,
                            width: "90%",
                            maxWidth: 480,
                            paddingVertical: 8,
                        },
                        style,
                    ]}
                >
                    {children}
                </Pressable>
            </Pressable>
        </Modal>
    );
}
