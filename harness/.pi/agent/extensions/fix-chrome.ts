/**
 * fix-chrome — repair a stale pi-chrome companion extension from inside pi.
 *
 * The failure this exists for: Chrome loads the pi-chrome companion from a plain
 * folder (e.g. C:\Users\<you>\pi-chrome-extension) that was hand-copied once. When
 * pi-chrome later updates, that folder keeps the old `service_worker.js`. The old
 * worker compares pi-chrome's version (stamped `x-pi-chrome-version` on every
 * `/next` poll) against its own manifest version, decides it is behind, calls
 * chrome.runtime.reload() — and returns *without reading the response body*, so
 * every command the bridge just handed it is discarded. Symptom: chrome_* tools
 * all time out with "the Chrome extension received the command but never returned
 * a result", `lastSeenAt` still ticks (polls look healthy), and reloading the
 * extension from chrome://extensions changes nothing because it reloads the same
 * stale code.
 *
 * `/fix-chrome` copies the current files from the installed pi-chrome package into
 * the folder Chrome actually loads (discovered from Chrome's own Secure
 * Preferences, so it works regardless of where that folder lives), then reports
 * both the on-disk and live versions. After a sync the stale worker self-reloads
 * on its next poll (<= ~25s) and picks up the new code; clicking Reload at
 * chrome://extensions applies it immediately.
 *
 * `/fix-chrome status` reports only — it reads, never writes.
 *
 * Overrides: PI_CHROME_PACKAGE_DIR (installed pi-chrome package),
 * PI_CHROME_EXTENSION_DIR (comma/newline separated dirs Chrome loads from).
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const BRIDGE_DIR_PARTS = ["extensions", "chrome-profile-bridge", "browser-extension"];
const EXTENSION_NAME = "Pi Chrome Connector";
const BRIDGE_HOST_HINT = "127.0.0.1:17318";
const BRIDGE_URL = `http://${BRIDGE_HOST_HINT}`;
const LIVE_PROBE_TIMEOUT_MS = 1_500;
const COPY_FILES = "manifest.json, service_worker.js, snapshot_injected.js";

type Json = Record<string, any>;

function readJson(file: string): Json | undefined {
	try {
		return JSON.parse(readFileSync(file, "utf8")) as Json;
	} catch {
		return undefined;
	}
}

function manifestVersion(dir: string): string | undefined {
	const version = readJson(join(dir, "manifest.json"))?.version;
	return typeof version === "string" ? version : undefined;
}

/** A directory is the pi-chrome companion if its manifest is named or scoped like it. */
export function isPiChromeExtensionDir(dir: string): boolean {
	const manifest = readJson(join(dir, "manifest.json"));
	if (!manifest) return false;
	if (manifest.name === EXTENSION_NAME) return true;
	const hosts = Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [];
	return hosts.some((host) => typeof host === "string" && host.includes(BRIDGE_HOST_HINT));
}

/** Node's own lib/node_modules plus the usual system prefixes. */
function globalNodeModuleDirs(): string[] {
	const dirs: string[] = [];
	// process.execPath -> <prefix>/bin/node, so <prefix>/lib/node_modules holds global installs.
	try {
		dirs.push(join(process.execPath, "..", "..", "lib", "node_modules"));
	} catch {
		// ignore
	}
	dirs.push("/usr/local/lib/node_modules", "/usr/lib/node_modules");
	return dirs;
}

function piAgentDir(): string {
	const explicit = process.env.PI_CONFIG_DIR?.trim() || process.env.PI_HOME?.trim();
	if (explicit) return explicit.endsWith("agent") ? explicit : join(explicit, "agent");
	return join(homedir(), ".pi", "agent");
}

/** The installed pi-chrome package's bundled browser-extension folder. */
export function findSourceDir(): { pkgDir: string; sourceDir: string; version?: string } | undefined {
	const candidates = [
		process.env.PI_CHROME_PACKAGE_DIR?.trim(),
		join(piAgentDir(), "npm", "node_modules", "pi-chrome"),
		join(homedir(), ".pi", "agent", "npm", "node_modules", "pi-chrome"),
		...globalNodeModuleDirs().map((dir) => join(dir, "pi-chrome")),
	].filter((value): value is string => typeof value === "string" && value.length > 0);

	for (const pkgDir of candidates) {
		const sourceDir = join(pkgDir, ...BRIDGE_DIR_PARTS);
		if (existsSync(join(sourceDir, "manifest.json"))) {
			return { pkgDir, sourceDir, version: manifestVersion(sourceDir) };
		}
	}
	return undefined;
}

function listWindowsUsers(): string[] {
	try {
		return readdirSync("/mnt/c/Users")
			.filter((name) => !/^(default|default user|all users|public|desktop\.ini)$/i.test(name))
			.map((name) => join("/mnt/c/Users", name))
			.filter((dir) => existsSync(dir));
	} catch {
		return [];
	}
}

/** Chrome user-data roots for native Linux/macOS/Windows and for WSL. */
export function chromeProfileRoots(): string[] {
	const roots: string[] = [];
	const add = (dir: string) => {
		if (dir && existsSync(dir) && !roots.includes(dir)) roots.push(dir);
	};
	const localAppData = process.env.LOCALAPPDATA?.trim();
	if (localAppData) add(join(localAppData, "Google", "Chrome", "User Data"));
	add(join(homedir(), "Library", "Application Support", "Google", "Chrome"));
	add(join(homedir(), ".config", "google-chrome"));
	add(join(homedir(), ".config", "chromium"));
	for (const user of listWindowsUsers()) add(join(user, "AppData", "Local", "Google", "Chrome", "User Data"));
	return roots;
}

/** Profile subdirectories (Default, Profile 1, ...) under a Chrome user-data root. */
function profileDirs(root: string): string[] {
	try {
		return readdirSync(root)
			.map((name) => join(root, name))
			.filter((dir) => {
				try {
					if (!statSync(dir).isDirectory()) return false;
				} catch {
					return false;
				}
				return existsSync(join(dir, "Secure Preferences")) || existsSync(join(dir, "Preferences"));
			});
	} catch {
		return [];
	}
}

/** Translate a Chrome-recorded path into one this process can stat. */
function toLocalPath(raw: string): string | undefined {
	const path = raw.trim().replace(/[/\\]+$/, "");
	if (!path) return undefined;
	if (existsSync(path)) return path;
	const windows = /^([a-zA-Z]):[\\/](.*)$/.exec(path);
	if (windows) {
		const mounted = `/mnt/${windows[1].toLowerCase()}/${windows[2].replace(/\\/g, "/")}`;
		if (existsSync(mounted)) return mounted;
	}
	return undefined;
}

/** Unpacked-extension folders Chromium has on record for a profile. */
function recordedExtensionPaths(profileDir: string): string[] {
	const settings = readJson(join(profileDir, "Secure Preferences"))?.extensions?.settings;
	if (!settings || typeof settings !== "object") return [];
	const paths: string[] = [];
	for (const entry of Object.values<Json>(settings)) {
		const recorded = entry?.path;
		if (typeof recorded === "string" && recorded.trim()) paths.push(recorded);
	}
	return paths;
}

/**
 * Folders Chrome is actually loading the pi-chrome companion from: whatever
 * Chromium recorded as an unpacked extension path, plus the conventional copy
 * location. Each is verified against the pi-chrome manifest fingerprint.
 */
export function findTargetDirs(): string[] {
	const found: string[] = [];
	const add = (dir: string | undefined) => {
		if (!dir || found.includes(dir)) return;
		if (existsSync(join(dir, "manifest.json")) && isPiChromeExtensionDir(dir)) found.push(dir);
	};

	const override = process.env.PI_CHROME_EXTENSION_DIR?.trim();
	if (override) for (const part of override.split(/[,\n]/)) add(toLocalPath(part) ?? part);

	for (const root of chromeProfileRoots()) {
		for (const profile of profileDirs(root)) {
			for (const recorded of recordedExtensionPaths(profile)) add(toLocalPath(recorded));
		}
	}

	for (const user of listWindowsUsers()) add(join(user, "pi-chrome-extension"));
	add(join(homedir(), "pi-chrome-extension"));
	return found;
}

/** Copy the source directory over the target, reporting what actually changed. */
export function syncDir(sourceDir: string, targetDir: string): { copied: string[]; unchanged: string[] } {
	const copied: string[] = [];
	const unchanged: string[] = [];
	for (const name of readdirSync(sourceDir)) {
		const source = join(sourceDir, name);
		const target = join(targetDir, name);
		if (statSync(source).isDirectory()) {
			mkdirSync(target, { recursive: true });
			const nested = syncDir(source, target);
			copied.push(...nested.copied.map((entry) => join(name, entry)));
			unchanged.push(...nested.unchanged.map((entry) => join(name, entry)));
			continue;
		}
		const before = existsSync(target) ? readFileSync(target) : undefined;
		const after = readFileSync(source);
		if (before?.equals(after)) {
			unchanged.push(name);
			continue;
		}
		copyFileSync(source, target);
		copied.push(name);
	}
	return { copied, unchanged };
}

/**
 * Version the extension reports right now, i.e. the code actually loaded in
 * Chrome (not what is on disk). Best-effort, read-only: returns undefined when
 * the bridge is not running or the extension is not polling.
 */
export async function liveExtensionVersion(): Promise<string | undefined> {
	try {
		const response = await fetch(`${BRIDGE_URL}/command`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ action: "tab.version", params: {}, timeoutMs: LIVE_PROBE_TIMEOUT_MS }),
			signal: AbortSignal.timeout(LIVE_PROBE_TIMEOUT_MS + 500),
		});
		const body = (await response.json()) as Json;
		const version = body?.result?.extensionVersion;
		return typeof version === "string" ? version : undefined;
	} catch {
		return undefined;
	}
}

export default function (pi: ExtensionAPI) {
	async function run(args: string, ctx: ExtensionContext): Promise<void> {
		const mode = args.trim().toLowerCase();
		if (mode && !["status", "--status", "check", "fix"].includes(mode)) {
			ctx.ui.notify(`Usage: /fix-chrome [status]  (got "${mode}")`, "warning");
			return;
		}
		const readOnly = mode === "status" || mode === "--status" || mode === "check";

		const live = await liveExtensionVersion();
		const source = findSourceDir();
		if (!source) {
			ctx.ui.notify(
				"fix-chrome: could not find the installed pi-chrome package.\n" +
					`Looked under ${piAgentDir()}/npm/node_modules and the global node_modules dirs.\n` +
					"Install it (settings.json packages: npm:pi-chrome) or set PI_CHROME_PACKAGE_DIR.",
				"error",
			);
			return;
		}

		const targets = findTargetDirs();
		if (targets.length === 0) {
			ctx.ui.notify(
				`fix-chrome: no Chrome-loaded copy of "${EXTENSION_NAME}" found (package is v${source.version ?? "?"}).\n` +
					"Load it once at chrome://extensions via Load unpacked, then rerun. Set PI_CHROME_EXTENSION_DIR to override.",
				"warning",
			);
			return;
		}

		const lines: string[] = [];
		const problems: string[] = [];
		let changedCount = 0;

		for (const target of targets) {
			const before = manifestVersion(target);
			if (readOnly) {
				const stale = before !== source.version;
				lines.push(`${stale ? "STALE" : "ok"}  v${before ?? "?"}  ${target}`);
				continue;
			}
			try {
				const { copied, unchanged } = syncDir(source.sourceDir, target);
				const after = manifestVersion(target);
				if (copied.length > 0) changedCount++;
				lines.push(
					`${copied.length > 0 ? "synced" : "ok"}  v${before ?? "?"} → v${after ?? "?"}  ${target}` +
						`${copied.length > 0 ? `  (${copied.join(", ")})` : `  (${unchanged.length} files already current)`}`,
				);
			} catch (error) {
				problems.push(`${target}: ${(error as Error).message}`);
			}
		}

		const summary: string[] = [];
		summary.push(
			`pi-chrome v${source.version ?? "?"}  ·  loaded in Chrome: ${live ? `v${live}` : "not reachable"}` +
				(source.version && live && live !== source.version ? "  ← stale, reload the extension" : ""),
		);
		summary.push(...lines);
		for (const problem of problems) summary.push(`ERROR  ${problem}`);

		if (!readOnly && changedCount > 0) {
			summary.push(
				"Next: click Reload on the extension card at chrome://extensions, or wait ~25s — the stale copy self-reloads on its next poll.",
			);
		} else if (!readOnly && live && live === source.version) {
			summary.push("Extension already current — chrome_* tools should work.");
		}

		ctx.ui.notify(summary.join("\n"), problems.length > 0 ? "error" : "info");
	}

	pi.registerCommand("fix-chrome", {
		description:
			`Repair a stale "${EXTENSION_NAME}" Chrome extension.\n` +
			`Copies the current ${COPY_FILES} from the installed pi-chrome package into the folder Chrome actually loads\n` +
			"(discovered from Chrome's own profile data), then reports the on-disk and live versions.\n" +
			"  /fix-chrome         — sync everything stale, then reload at chrome://extensions\n" +
			"  /fix-chrome status  — report only, change nothing",
		getArgumentCompletions: (prefix) => {
			const matches = ["status"]
				.filter((value) => value.startsWith(prefix.trim().toLowerCase()))
				.map((value) => ({ value, label: value, description: "Report versions without changing anything" }));
			return matches.length > 0 ? matches : null;
		},
		handler: (args, ctx) => run(args ?? "", ctx),
	});
}
