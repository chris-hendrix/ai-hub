import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { randomUUID } from "node:crypto";

export type CompleteRequest = {
  instruction: string;
  conversation: string;
  facts?: string;
};

export interface Runner {
  complete(req: CompleteRequest, signal?: AbortSignal): Promise<string | null>;
}

/**
 * Runner seam (pure delegation): calls `runner.complete` exactly ONCE with
 * the request unchanged and returns its result.
 */
export function generate(
  req: CompleteRequest,
  runner: Runner,
  signal?: AbortSignal,
): Promise<string | null> {
  return runner.complete(req, signal);
}

type PiModel = NonNullable<ExtensionCommandContext["model"]>;
type PiRegistry = ExtensionCommandContext["modelRegistry"];

/**
 * pi modelRegistry adapter implementing the plan's model-call contract:
 * instruction as systemPrompt, conversation (+facts) as a single user
 * message, `stopReason === "aborted"` -> null, otherwise joined text
 * blocks (null when there is no text).
 */
export function createPiRunner(model: PiModel, modelRegistry: PiRegistry): Runner {
  return {
    async complete(req: CompleteRequest, signal?: AbortSignal): Promise<string | null> {
      const userText =
        `## Conversation History\n\n${req.conversation}` +
        (req.facts ? `\n\n## Workspace\n\n${req.facts}` : "");
      const res = await modelRegistry.complete(
        model,
        {
          systemPrompt: req.instruction,
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: userText }],
              timestamp: Date.now(),
            },
          ],
        },
        { signal, cacheRetention: "none", sessionId: randomUUID() },
      );
      if (res.stopReason === "aborted") return null;
      const text = res.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("\n");
      return text === "" ? null : text;
    },
  };
}
