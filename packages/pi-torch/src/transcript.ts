import {
  convertToLlm,
  serializeConversation,
  type SessionEntry,
  type SessionMessageEntry,
} from "@earendil-works/pi-coding-agent";

/** AgentMessage without importing pi-agent-core (unlinked here). */
type BranchMessage = SessionMessageEntry["message"];

function entryToMessage(entry: SessionEntry): BranchMessage | undefined {
  if (entry.type === "message") {
    return entry.message;
  }
  if (entry.type === "compaction") {
    return {
      role: "compactionSummary",
      summary: entry.summary,
      tokensBefore: entry.tokensBefore,
      timestamp: new Date(entry.timestamp).getTime(),
    };
  }
  return undefined;
}

/**
 * Compaction-aware transcript selection (pure).
 *
 * Ports the upstream `getHandoffMessages` selection, but returns entries:
 * find the LAST `type === "compaction"` entry; if none, return the branch
 * as-is; otherwise return `[compaction, ...entries between
 * firstKeptEntryId and the compaction, ...entries after the compaction]`.
 * Never returns the whole branch when a compaction exists.
 */
export function pickHandoffEntries(branch: SessionEntry[]): SessionEntry[] {
  let compactionIndex = -1;
  for (let i = branch.length - 1; i >= 0; i--) {
    if (branch[i]!.type === "compaction") {
      compactionIndex = i;
      break;
    }
  }
  if (compactionIndex < 0) {
    return branch;
  }
  const compaction = branch[compactionIndex]!;
  const firstKeptIndex =
    compaction.type === "compaction"
      ? branch.findIndex((entry) => entry.id === compaction.firstKeptEntryId)
      : -1;
  return [
    compaction,
    ...(firstKeptIndex >= 0 ? branch.slice(firstKeptIndex, compactionIndex) : []),
    ...branch.slice(compactionIndex + 1),
  ];
}

/**
 * Map entries to AgentMessage (message entries pass through; compaction
 * entries become compaction summaries), then convert + serialize for the
 * model prompt.
 */
export function toConversationText(entries: SessionEntry[]): string {
  const messages = entries
    .map(entryToMessage)
    .filter((message): message is BranchMessage => message !== undefined);
  return serializeConversation(convertToLlm(messages));
}
