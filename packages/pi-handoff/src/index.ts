import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import {
  BorderedLoader,
  getAgentDir,
  getMarkdownTheme,
} from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Text } from "@earendil-works/pi-tui";
import { readFileSync } from "node:fs";
import { readHandoffConfig } from "./config.ts";
import { extractSummary, extractTopic, formatStamp } from "./format.ts";
import { resolvePrompt } from "./prompt.ts";
import { gatherFacts } from "./facts.ts";
import { createPiRunner, generate, type Runner } from "./generate.ts";
import { inject } from "./inject.ts";
import { pickHandoffEntries, toConversationText } from "./transcript.ts";

type HandoffDetails = {
  topic?: string;
  summary?: string;
  sourceSession?: string;
  createdAt?: string;
};

async function handleHandoff(pi: ExtensionAPI, ctx: ExtensionCommandContext): Promise<void> {
  if (ctx.mode !== "tui") {
    ctx.ui.notify("handoff requires interactive mode", "error");
    return;
  }
  if (!ctx.model) {
    ctx.ui.notify("No model selected", "error");
    return;
  }
  const branch = ctx.sessionManager.getBranch();
  const hasContent = branch.some(
    (entry) => entry.type === "message" && entry.message.role !== "system",
  );
  if (!hasContent) {
    ctx.ui.notify("Nothing to hand off yet", "warning");
    return;
  }
  try {
    const sources = readHandoffConfig(ctx.cwd, getAgentDir());
    const resolved = resolvePrompt(sources, (p) => readFileSync(p, "utf-8"));
    if (!resolved.ok) {
      ctx.ui.notify(resolved.error, "error");
      return;
    }
    const { instruction, custom } = resolved;
    const conversation = toConversationText(pickHandoffEntries(branch));
    const facts = custom
      ? undefined
      : await gatherFacts((command, args) => pi.exec(command, args, { cwd: ctx.cwd }));
    const adapter: Runner = createPiRunner(ctx.model, ctx.modelRegistry);

    const doc = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
      const loader = new BorderedLoader(tui, theme, "Generating handoff…");
      loader.onAbort = () => done(null);
      generate({ instruction, conversation, facts }, adapter, loader.signal)
        .then(done)
        .catch(() => done(null));
      return loader;
    });

    if (doc === null) {
      ctx.ui.notify("Cancelled", "info");
      return;
    }

    const topic = extractTopic(doc);
    const summary = extractSummary(doc);
    const createdAt = new Date().toISOString();
    pi.appendEntry("handoff", { doc, topic, summary, createdAt });

    const sourceSession = ctx.sessionManager.getSessionId();
    const parentSession = ctx.sessionManager.getSessionFile();
    await ctx.newSession({
      parentSession,
      withSession: async (r) => {
        await inject(r, { doc, topic, summary, sourceSession, createdAt });
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    ctx.ui.notify(`Handoff failed: ${detail}`, "error");
  }
}

export default function piHandoff(pi: ExtensionAPI): void {
  pi.registerCommand("handoff", {
    description: "Write a handoff and continue in a fresh session with it injected",
    handler: async (_args, ctx) => {
      await handleHandoff(pi, ctx);
    },
  });

  pi.registerMessageRenderer("handoff", (message, options, theme) => {
    const details = (message.details as HandoffDetails | undefined) ?? {};
    const topic = details.topic ?? "session handoff";
    const body =
      typeof message.content === "string"
        ? message.content
        : message.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join("\n");
    const words = body.split(/\s+/).filter((w) => w !== "").length;
    const container = new Container();
    const createdAtStamp = details.createdAt ? formatStamp(Date.parse(details.createdAt)) : "";
    const header =
      `${theme.fg("accent", "⧉")} handoff — ${topic}\n` +
      theme.fg(
        "dim",
        `from session ${(details.sourceSession ?? "unknown").slice(0, 8)} · ${createdAtStamp} · ${words} words`,
      ) +
      (options.expanded ? "" : `\n${theme.fg("dim", "▸ expand")}`);
    container.addChild(new Text(header, 0, 0));
    if (options.expanded) {
      container.addChild(new Markdown(body, 0, 0, getMarkdownTheme()));
    }
    return container;
  });

  pi.registerEntryRenderer("handoff", (entry, _options, theme) => {
    const data =
      (entry.data as { topic?: string } | undefined) ?? {};
    const container = new Container();
    container.addChild(
      new Text(
        `${theme.fg("accent", "⧉")} ${theme.fg("dim", `handoff written — ${data.topic ?? "session handoff"}`)}`,
        0,
        0,
      ),
    );
    return container;
  });
}
