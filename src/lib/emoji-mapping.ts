// Emoji mapping to store keys in database instead of actual emojis
// This avoids issues with emoji characters in Convex database

export const EMOJI_MAP = {
  heart: "❤️",
  thumbs_up: "👍",
  party: "🎉",
  laughing: "😂",
  fire: "🔥",
  heart_eyes: "😍",
} as const;

export type EmojiKey = keyof typeof EMOJI_MAP;

// Reverse mapping for converting emojis back to keys
export const EMOJI_TO_KEY: Record<string, EmojiKey> = Object.fromEntries(
  Object.entries(EMOJI_MAP).map(([key, emoji]) => [emoji, key as EmojiKey])
) as Record<string, EmojiKey>;

// Get emoji from key with fallback
export function getEmojiFromKey(key: string): string {
  return EMOJI_MAP[key as EmojiKey] || key;
}

// Get key from emoji with fallback
export function getKeyFromEmoji(emoji: string): string {
  return EMOJI_TO_KEY[emoji] || emoji;
}

// Get all available emoji options for picker
export function getEmojiOptions(): Array<{ key: EmojiKey; emoji: string }> {
  return Object.entries(EMOJI_MAP).map(([key, emoji]) => ({
    key: key as EmojiKey,
    emoji,
  }));
}
