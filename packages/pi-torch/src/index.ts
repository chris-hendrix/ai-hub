import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import {
  BorderedLoader,
  SessionManager,
  getAgentDir,
  getMarkdownTheme,
} from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Text } from "@earendil-works/pi-tui";
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readHandoffConfig } from "./config.ts";
import { extractSummary, extractTopic, formatStamp, orderRows } from "./format.ts";
import { resolvePrompt } from "./prompt.ts";
import { gatherFacts } from "./facts.ts";
import { createPiRunner, generate, type Runner } from "./generate.ts";
import { inject } from "./inject.ts";
import { pickSession, reuse } from "./picker.ts";
import { nodeScanFs, resolveSessionId, scanRootFor, scanSessions, type SessionRow } from "./sessions.ts";
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
  if (!ctx.isIdle()) {
    ctx.ui.notify("Finish the current turn before handing off", "warning");
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

async function handlePickup(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  argsText: string,
): Promise<void> {
  if (ctx.mode !== "tui") {
    ctx.ui.notify("pickup requires interactive mode", "error");
    return;
  }
  if (!ctx.isIdle()) {
    ctx.ui.notify("Finish the current turn before picking up", "warning");
    return;
  }
  const model = ctx.model;
  if (!model) {
    ctx.ui.notify("No model selected", "error");
    return;
  }
  try {
    // getSessionDir() is the per-project encoded leaf in the default layout,
    // so scanRootFor maps it to the base dir (every workspace) and leaves a
    // custom --session-dir alone. Scanning the leaf itself would find nothing.
    const sessionDir =
      ctx.sessionManager.getSessionDir() || join(homedir(), ".pi", "agent", "sessions");
    const root = scanRootFor(sessionDir);
    const current = ctx.sessionManager.getSessionFile();
    // NO limit: id resolution must see everything.
    const rows = scanSessions({ root, current, fs: nodeScanFs() });

    let row: SessionRow;
    const needle = argsText.trim();
    if (needle !== "") {
      const resolved = resolveSessionId(rows, needle);
      if (!resolved.ok) {
        ctx.ui.notify(resolved.error, "error");
        return;
      }
      row = resolved.row;
    } else {
      const picked = await pickSession(ctx, orderRows(rows, ctx.cwd), ctx.cwd);
      if (picked === null) {
        ctx.ui.notify("Cancelled", "info");
        return;
      }
      row = picked;
    }

    let doc: string;
    let topic: string;
    let summary: string;
    let createdAt: string;
    if (row.mark === "ready") {
      // REUSE path: zero model calls, no I/O, nothing logged to the model.
      const reused = reuse(row);
      if (!reused.ok) {
        ctx.ui.notify(reused.error, "error");
        return;
      }
      doc = reused.handoff.doc;
      topic = reused.handoff.topic;
      summary = reused.handoff.summary;
      createdAt = row.signifier?.createdAt || new Date().toISOString();
    } else {
      // DERIVE path: generate a handoff from the source session, then write
      // the signifier back to that session so the next pickup reuses it.
      let freshMtime: number;
      try {
        freshMtime = statSync(row.path).mtimeMs;
      } catch {
        freshMtime = Number.NaN;
      }
      if (freshMtime !== row.mtimeMs) {
        ctx.ui.notify("Session changed since it was listed; run /pickup again", "error");
        return;
      }
      const sm = SessionManager.open(row.path);
      const branch = sm.getBranch();
      const sources = readHandoffConfig(ctx.cwd, getAgentDir());
      const resolved = resolvePrompt(sources, (p) => readFileSync(p, "utf-8"));
      if (!resolved.ok) {
        ctx.ui.notify(resolved.error, "error");
        return;
      }
      const { instruction, custom } = resolved;
      const conversation = toConversationText(pickHandoffEntries(branch));
      // DEVIATION (authorized): workspace facts are gathered in the SOURCE
      // session's workspace (row.cwd), not the current cwd.
      const facts = custom
        ? undefined
        : await gatherFacts((command, commandArgs) =>
            pi.exec(command, commandArgs, { cwd: row.cwd }),
          );
      const adapter: Runner = createPiRunner(model, ctx.modelRegistry);

      const generated = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
        const loader = new BorderedLoader(tui, theme, "Generating handoff…");
        loader.onAbort = () => done(null);
        generate({ instruction, conversation, facts }, adapter, loader.signal)
          .then(done)
          .catch(() => done(null));
        return loader;
      });

      if (generated === null) {
        ctx.ui.notify("Cancelled", "info");
        return;
      }
      doc = generated;
      topic = extractTopic(doc);
      summary = extractSummary(doc);
      createdAt = new Date().toISOString();
      try {
        sm.appendCustomEntry("handoff", {
          doc,
          topic,
          summary,
          createdAt,
          from: ctx.sessionManager.getSessionId(),
        });
      } catch (err) {
        // The doc is in hand: warn but still inject.
        const detail = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`could not write handoff back to source session: ${detail}`, "warning");
      }
    }

    const sourceSession = row.id;
    await ctx.newSession({
      parentSession: row.path,
      withSession: async (r) => {
        await inject(r, { doc, topic, summary, sourceSession, createdAt });
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    ctx.ui.notify(`Pickup failed: ${detail}`, "error");
  }
}

export default function piHandoff(pi: ExtensionAPI): void {
  pi.registerCommand("handoff", {
    description: "Write a handoff and continue in a fresh session with it injected",
    handler: async (_args, ctx) => {
      await handleHandoff(pi, ctx);
    },
  });

  pi.registerCommand("pickup", {
    description: "Pick up a handoff from another session",
    handler: async (args, ctx) => {
      await handlePickup(pi, ctx, args);
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
