export interface Reaction {
  id: number;
  message_id: number;
  emoji: string;
  author: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  authors: string[];
}

export function groupReactions(
  reactions: Reaction[],
  currentUserName: string,
): ReactionGroup[] {
  const groups = new Map<string, ReactionGroup>();

  for (const reaction of reactions) {
    const existing = groups.get(reaction.emoji);

    if (existing) {
      existing.count += 1;
      existing.authors.push(reaction.author);
      if (reaction.author === currentUserName) {
        existing.reactedByMe = true;
      }
      continue;
    }

    groups.set(reaction.emoji, {
      emoji: reaction.emoji,
      count: 1,
      reactedByMe: reaction.author === currentUserName,
      authors: [reaction.author],
    });
  }

  return [...groups.values()];
}
