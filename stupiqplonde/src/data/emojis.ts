export interface EmojiItem {
  char: string;
  name: string;
  keywords: string[];
}

export interface EmojiCategory {
  id: string;
  label: string;
  emojis: EmojiItem[];
}

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "🎉"] as const;

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Смайлы",
    emojis: [
      { char: "😀", name: "улыбка", keywords: ["smile", "happy", "grin"] },
      { char: "😊", name: "смущение", keywords: ["blush", "happy"] },
      { char: "😂", name: "слёзы радости", keywords: ["lol", "laugh"] },
      { char: "🥰", name: "влюблённость", keywords: ["love", "hearts"] },
      { char: "😎", name: "крутой", keywords: ["cool", "sunglasses"] },
      { char: "🤔", name: "думаю", keywords: ["think", "hmm"] },
      { char: "😴", name: "сон", keywords: ["sleep", "tired"] },
      { char: "😭", name: "плач", keywords: ["cry", "sad"] },
      { char: "😡", name: "злость", keywords: ["angry", "mad"] },
      { char: "🥶", name: "замёрз", keywords: ["cold", "freeze"] },
      { char: "🤡", name: "клоун", keywords: ["clown", "joke"] },
      { char: "🤯", name: "взрыв мозга", keywords: ["mind", "blown"] },
    ],
  },
  {
    id: "gestures",
    label: "Жесты",
    emojis: [
      { char: "👍", name: "лайк", keywords: ["like", "thumb", "ok"] },
      { char: "👎", name: "дизлайк", keywords: ["dislike", "thumb"] },
      { char: "🙏", name: "спасибо", keywords: ["please", "thanks", "pray"] },
      { char: "👏", name: "аплодисменты", keywords: ["clap", "bravo"] },
      { char: "👀", name: "глаза", keywords: ["eyes", "look"] },
      { char: "🤝", name: "рукопожатие", keywords: ["deal", "handshake"] },
      { char: "✌️", name: "мир", keywords: ["peace", "victory"] },
      { char: "🤞", name: "удача", keywords: ["luck", "fingers"] },
    ],
  },
  {
    id: "symbols",
    label: "Символы",
    emojis: [
      { char: "❤️", name: "сердце", keywords: ["heart", "love"] },
      { char: "🔥", name: "огонь", keywords: ["fire", "hot"] },
      { char: "🎉", name: "праздник", keywords: ["party", "tada"] },
      { char: "✨", name: "блеск", keywords: ["sparkle", "stars"] },
      { char: "💯", name: "сто", keywords: ["100", "perfect"] },
      { char: "⭐", name: "звезда", keywords: ["star"] },
      { char: "✅", name: "готово", keywords: ["check", "done"] },
      { char: "⚠️", name: "внимание", keywords: ["warning"] },
    ],
  },
];

export const EMOJIS = EMOJI_CATEGORIES.flatMap((category) =>
  category.emojis.map((item) => item.char),
);

export function filterEmojis(query: string): EmojiItem[] {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return EMOJI_CATEGORIES.flatMap((category) => category.emojis);
  }

  return EMOJI_CATEGORIES.flatMap((category) =>
    category.emojis.filter((item) => {
      return (
        item.char.includes(needle) ||
        item.name.includes(needle) ||
        item.keywords.some((keyword) => keyword.includes(needle))
      );
    }),
  );
}
