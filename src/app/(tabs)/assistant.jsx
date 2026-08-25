import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import ChatBubble from "@/components/ai/ChatBubble";
import SuggestionChips from "@/components/ai/SuggestionChips";
import TypingIndicator from "@/components/ai/TypingIndicator";
import {
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
  getSuggestions,
} from "@/services/aiService";

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "[INFO] I'm your AI emergency assistant. I can help you stay safe during disasters, understand risks in your area, and guide you through emergencies.\n\nWhat would you like to know?",
};

export default function Assistant() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const initialized = useRef(false);

  const loadHistory = useCallback(async () => {
    try {
      const data = await getChatHistory({ limit: 50 });
      if (data.messages && data.messages.length > 0) {
        const formatted = data.messages.map((m) => ({
          role: m.role,
          content: m.content,
          id: m.conversation_id,
        }));
        setMessages(formatted);
        setShowSuggestions(false);
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
    } catch {
      setMessages([WELCOME_MESSAGE]);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const data = await getSuggestions();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadHistory();
    loadSuggestions();
  }, [loadHistory, loadSuggestions]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  const handleSend = useCallback(
    async (text) => {
      const msg = (text || input).trim();
      if (!msg || loading) return;

      const userMessage = { role: "user", content: msg };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);
      setShowSuggestions(false);
      scrollToBottom();

      try {
        const data = await sendChatMessage(msg);
        const assistantMessage = { role: "assistant", content: data.reply };
        setMessages((prev) => [...prev, assistantMessage]);
        scrollToBottom();
      } catch {
        const errorMessage = {
          role: "assistant",
          content:
            "[WARNING] Sorry, I couldn't process your request right now. Please check your connection and try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [input, loading, scrollToBottom]
  );

  const handleClearChat = useCallback(() => {
    Alert.alert(
      "Clear conversation",
      "This will delete all your chat history with the assistant.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearChatHistory();
              setMessages([WELCOME_MESSAGE]);
              setShowSuggestions(true);
              loadSuggestions();
            } catch {
              Alert.alert("Error", "Failed to clear chat history.");
            }
          },
        },
      ]
    );
  }, [loadSuggestions]);

  const handleSuggestionSelect = useCallback(
    (text) => {
      handleSend(text);
    },
    [handleSend]
  );

  const renderItem = useCallback(
    ({ item }) => <ChatBubble message={item} isUser={item.role === "user"} />,
    []
  );

  const keyExtractor = useCallback(
    (item, index) => item.id?.toString() || `msg-${index}`,
    []
  );

  const renderHeader = useCallback(() => {
    if (messages.length > 1) return null;
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.logoWrap}>
          <Image
            source={require("@/assets/icons/logo.png")}
            style={styles.logoImage}
          />
        </View>
        <Text style={styles.welcomeTitle}>AGAP.ai</Text>
        <Text style={styles.welcomeTagline}>MAAGAP NA KA-AGAPAY</Text>
        <Text style={styles.welcomeSubtitle}>
          Your AI-powered emergency assistant. Ask about disaster preparedness, safety tips, or emergency guidance.
        </Text>
      </View>
    );
  }, [messages.length]);

  const renderFooter = useCallback(() => {
    if (loading) {
      return (
        <View>
          <TypingIndicator />
          <View style={{ height: 8 }} />
        </View>
      );
    }
    return <View style={{ height: 8 }} />;
  }, [loading]);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Image
                source={require("@/assets/icons/logo.png")}
                style={styles.headerLogo}
              />
            </View>
            <View>
              <Text style={styles.headerTitle}>AGAP.ai</Text>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.headerStatus}>Online</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleClearChat}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        <View style={styles.chatArea}>
          {showSuggestions && suggestions.length > 0 && messages.length <= 1 && (
            <SuggestionChips
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
              visible={true}
            />
          )}

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={scrollToBottom}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            style={styles.flatList}
          />
        </View>

        <View
          style={[
            styles.inputBar,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Ask me anything..."
              placeholderTextColor={colors.placeholder}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
              editable={!loading}
              selectionColor={colors.primary}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSend()}
              disabled={!input.trim() || loading}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-up"
                size={22}
                fontWeight="bold"
                color={!input.trim() || loading ? colors.muted : colors.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: colors.primary,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34D399",
  },
  headerStatus: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatArea: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  welcomeContainer: {
    alignItems: "center",
    paddingHorizontal: 36,
    paddingTop: 32,
    paddingBottom: 16,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 22,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  welcomeTagline: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 21,
  },
  flatList: {
    flex: 1,
  },
  chatContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 5,
    minHeight: 46,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 11,
    maxHeight: 120,
    lineHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginBottom: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
});
