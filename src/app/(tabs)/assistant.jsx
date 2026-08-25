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
    }, 100);
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
    ({ item, index }) => (
      <ChatBubble message={item} isUser={item.role === "user"} />
    ),
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
          <Ionicons name="sparkles" size={28} color={colors.white} />
        </View>
        <Text style={styles.welcomeTitle}>AGAP AI Assistant</Text>
        <Text style={styles.welcomeSubtitle}>
          Ask me anything about disaster preparedness, safety tips, or emergency guidance.
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles" size={16} color={colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerStatus}>Always here to help</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleClearChat}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

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
        contentContainerStyle={[
          styles.chatContent,
          { paddingTop: messages.length <= 1 ? 8 : 12 },
        ]}
        onContentSizeChange={scrollToBottom}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />

      <View
        style={[
          styles.inputBar,
          { paddingBottom: Math.max(insets.bottom, 8) },
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
              size={20}
              color={!input.trim() || loading ? colors.muted : colors.white}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  headerStatus: {
    fontSize: 12,
    color: colors.muted,
  },
  headerButton: {
    padding: 6,
  },
  welcomeContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 16,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  chatContent: {
    flexGrow: 1,
  },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 14,
    paddingRight: 4,
    minHeight: 44,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginBottom: 5,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
  },
});
