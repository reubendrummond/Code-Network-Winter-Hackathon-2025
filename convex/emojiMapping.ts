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

// Validate if a key is a valid emoji key
export function isValidEmojiKey(key: string): key is EmojiKey {
  return key in EMOJI_MAP;
}

// Weights used to rank media based on reactions
export const EMOJI_WEIGHT: Record<EmojiKey, number> = {
  heart: 3,
  thumbs_up: 1,
  party: 3,
  laughing: 4,
  fire: 4,
  heart_eyes: 4,
};

export function getWeightFromKey(key: string): number {
  const k = key as EmojiKey;
  return k in EMOJI_WEIGHT ? EMOJI_WEIGHT[k] : 0;
}

// meaningless comment ;)
// hehe
