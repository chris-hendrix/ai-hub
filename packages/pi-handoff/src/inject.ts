import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { RECEIVE_DIRECTIVE } from "./prompt.ts";

// ReplacedSessionContext is not re-exported from the package root; derive the
// exact type from the withSession callback of newSession.
type NewSessionOptions = NonNullable<Parameters<ExtensionCommandContext["newSession"]>[0]>;
export type ReplacedSessionContext =
  NonNullable<NewSessionOptions["withSession"]> extends (ctx: infer C) => unknown ? C : never;

export type HandoffPayload = {
  doc: string;
  topic: string;
  summary: string;
  sourceSession: string | undefined;
  createdAt: string;
};

/**
 * Inject a handoff into a fresh session: EXACTLY two writes in this order.
 * 1. the doc as a displayed `handoff` message (no turn trigger);
 * 2. the receive directive as a hidden `handoff-receive` message — the ONLY trigger.
 */
export async function inject(r: ReplacedSessionContext, payload: HandoffPayload): Promise<void> {
  await r.sendMessage({
    customType: "handoff",
    content: payload.doc,
    display: true,
    details: {
      topic: payload.topic,
      summary: payload.summary,
      sourceSession: payload.sourceSession,
      createdAt: payload.createdAt,
    },
  });
  await r.sendMessage(
    { customType: "handoff-receive", content: RECEIVE_DIRECTIVE, display: false },
    { triggerTurn: true },
  );
}
