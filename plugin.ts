// ============================================================================
// Agent Monitor — OpenClaw Plugin Entry Point
// ============================================================================
//
// Registers a background service that launches the Next.js standalone server.
// The dashboard auto-connects to the local OpenClaw gateway.
//
// Config (plugins.entries.agent-monitor.config):
//   port  — HTTP port for the dashboard (default 3200)
//   host  — bind address (default "0.0.0.0")
//
// Usage:
//   openclaw plugins install @openclaw/agent-monitor
//   # then restart gateway — dashboard is at http://localhost:3200
// ============================================================================

import { spawn, type ChildProcess } from "child_process";
import { join, dirname } from "path";
import { existsSync, cpSync } from "fs";
import { fileURLToPath } from "url";

interface AgentMonitorConfig {
  enabled?: boolean;
  port?: number;
  host?: string;
}

function resolveConfig(raw: unknown): AgentMonitorConfig {
  const cfg =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    enabled: typeof cfg.enabled === "boolean" ? cfg.enabled : true,
    port: typeof cfg.port === "number" ? cfg.port : 3200,
    host: typeof cfg.host === "string" ? cfg.host : "0.0.0.0",
  };
}

const agentMonitorPlugin = {
  id: "agent-monitor",
  name: "Agent Monitor",
  description:
    "Real-time AI agent visualization & monitoring dashboard with pixel-art office",

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(api: any) {
    const config = resolveConfig(api.pluginConfig);

    let serverProcess: ChildProcess | null = null;
    let stopping = false;

    // Resolve paths relative to this plugin file
    const pluginDir =
      typeof __dirname !== "undefined"
        ? __dirname
        : dirname(fileURLToPath(import.meta.url));

    // The standalone server lives in .next/standalone after `next build`
    const standalonePath = join(pluginDir, ".next", "standalone", "server.js");
    const standaloneDir = join(pluginDir, ".next", "standalone");
    // For dev: fall back to running `next start`
    const useStandalone = existsSync(standalonePath);

    // Ensure static assets are copied into standalone dir
    if (useStandalone) {
      const staticSrc = join(pluginDir, ".next", "static");
      const staticDst = join(standaloneDir, ".next", "static");
      const publicSrc = join(pluginDir, "public");
      const publicDst = join(standaloneDir, "public");
      try {
        if (existsSync(staticSrc) && !existsSync(staticDst)) {
          cpSync(staticSrc, staticDst, { recursive: true });
        }
        if (existsSync(publicSrc) && !existsSync(publicDst)) {
          cpSync(publicSrc, publicDst, { recursive: true });
        }
      } catch {
        // Non-fatal — static assets may already be in place
      }
    }

    api.registerService({
      id: "agent-monitor",

      start: async () => {
        if (!config.enabled) {
          api.logger.info("[agent-monitor] Disabled via config");
          return;
        }

        stopping = false;

        // Resolve gateway connection info
        const gatewayPort = api.config?.gateway?.port ?? 18789;
        const gatewayToken = api.config?.gateway?.auth?.token ?? "";

        const env = {
          ...process.env,
          PORT: String(config.port),
          HOSTNAME: config.host!,
          NODE_ENV: "production",
          // Pass gateway info so the Next.js API routes can connect
          OPENCLAW_GATEWAY_PORT: String(gatewayPort),
          OPENCLAW_GATEWAY_TOKEN: gatewayToken,
        } as NodeJS.ProcessEnv;

        if (useStandalone) {
          api.logger.info(
            `[agent-monitor] Starting standalone server on ${config.host}:${config.port}`
          );
          serverProcess = spawn(process.execPath, [standalonePath], {
            cwd: standaloneDir,
            env,
            stdio: ["ignore", "pipe", "pipe"],
          });
        } else {
          // Fallback: use npx next start (development installs)
          const npx = process.platform === "win32" ? "npx.cmd" : "npx";
          api.logger.info(
            `[agent-monitor] Starting via 'next start' on ${config.host}:${config.port}`
          );
          serverProcess = spawn(npx, ["next", "start", "-p", String(config.port), "-H", config.host!], {
            cwd: pluginDir,
            env,
            stdio: ["ignore", "pipe", "pipe"],
          });
        }

        serverProcess.stdout?.on("data", (data: Buffer) => {
          const line = data.toString().trim();
          if (line) api.logger.info(`[agent-monitor] ${line}`);
        });

        serverProcess.stderr?.on("data", (data: Buffer) => {
          const line = data.toString().trim();
          if (line) api.logger.warn(`[agent-monitor] ${line}`);
        });

        serverProcess.on("exit", (code) => {
          if (!stopping) {
            api.logger.warn(
              `[agent-monitor] Server exited with code ${code}`
            );
          }
          serverProcess = null;
        });

        serverProcess.on("error", (err) => {
          api.logger.error(
            `[agent-monitor] Failed to start: ${err.message}`
          );
          serverProcess = null;
        });

        api.logger.info(
          `[agent-monitor] Dashboard available at http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`
        );
      },

      stop: async () => {
        stopping = true;
        if (serverProcess) {
          api.logger.info("[agent-monitor] Stopping dashboard server...");
          serverProcess.kill("SIGTERM");
          // Give it 5s to shut down gracefully
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              if (serverProcess) {
                serverProcess.kill("SIGKILL");
              }
              resolve();
            }, 5000);
            serverProcess?.on("exit", () => {
              clearTimeout(timeout);
              resolve();
            });
          });
          serverProcess = null;
        }
      },
    });

    // Register a CLI command for quick access
    api.registerCli(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ program }: any) => {
        program
          .command("monitor")
          .description("Agent Monitor dashboard")
          .option("-p, --port <port>", "Override port", String(config.port))
          .option("--open", "Open browser after start")
          .action(async (opts: { port: string; open?: boolean }) => {
            const port = opts.port || config.port;
            const url = `http://localhost:${port}`;
            console.log(`🏢 Agent Monitor: ${url}`);
            if (opts.open) {
              const { exec } = await import("child_process");
              const cmd =
                process.platform === "darwin"
                  ? `open ${url}`
                  : process.platform === "win32"
                    ? `start ${url}`
                    : `xdg-open ${url}`;
              exec(cmd);
            }
          });
      },
      { commands: ["monitor"] }
    );

    // Register a gateway RPC method to check monitor status
    api.registerGatewayMethod(
      "monitor.status",
      ({ respond }: { respond: (ok: boolean, payload?: unknown) => void }) => {
        respond(true, {
          running: serverProcess !== null,
          port: config.port,
          host: config.host,
          url: `http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`,
          standalone: useStandalone,
        });
      }
    );
  },
};

export default agentMonitorPlugin;
