import { Text } from "react-native";

function getTimeBasedGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Time-aware greeting text, e.g. "Good afternoon John Paul!".
 *
 * Props:
 * - firstName (string, optional): the signed-in user's first name, supplied
 *   by the app. When omitted, renders the greeting without a name
 *   ("Good afternoon!").
 * - style (Text style, optional)
 * - numberOfLines / ellipsizeMode (optional): forwarded to <Text> so a long
 *   name truncates instead of wrapping or overflowing. Defaults to a single
 *   line, cut off with "...".
 */
export default function LiveGreeting({
  firstName,
  style,
  numberOfLines = 1,
  ellipsizeMode = "tail",
}) {
  const greeting = getTimeBasedGreeting();
  const name = firstName ? ` ${firstName}` : "";

  return (
    <Text style={style} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode}>
      {greeting}
      {name}!
    </Text>
  );
}
