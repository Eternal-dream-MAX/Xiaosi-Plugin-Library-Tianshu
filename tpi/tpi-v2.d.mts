// TPI 2.0 isolated-host author-facing types. Capabilities are present only when granted.
import type { TpiLifecycleHandlers, TpiToolResult } from './tpi.d.mts';

export interface Tpi2ToolCall {
  args: Record<string, unknown>;
  cwd: string;
  signal: AbortSignal;
}

export interface Tpi2ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  concurrencySafe?: boolean;
  requiresApproval?: boolean;
  timeoutMs?: number;
  execute(call: Tpi2ToolCall): TpiToolResult | Promise<TpiToolResult>;
}

export interface Tpi2Host {
  readonly tpiVersion: '2.0';
  readonly pluginId: string;
  readonly sessionId?: string;
  readonly isWorker: boolean;
  readonly log: { debug(message: string): void; warn(message: string): void };
  readonly storage?: { dataDir(): Promise<string> };
  readonly embeddings?: { available(): Promise<boolean>; embed(texts: string[]): Promise<number[][]> };
  readonly sidePathLLM?: { complete(prompt: string, options: { timeoutMs: number }): Promise<string> };
  readonly promptContext?: { setBlock(block: string | null): Promise<null> };
  readonly transcripts?: {
    listSessions(limit?: number): Promise<string[]>;
    read(sessionId: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>>;
  };
  readonly net?: {
    fetch(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string | null }): Promise<{
      status: number; url: string; headers: Record<string, string>; body: string;
    }>;
  };
  readonly workspace?: {
    read(path: string): Promise<string>;
    list(path: string): Promise<Array<{ name: string; type: 'file' | 'directory' | 'other' }>>;
    write(path: string, content: string): Promise<null>;
  };
  readonly shell?: { run(command: string, options?: { timeoutMs?: number }): Promise<{ exitCode: number | null; output: string }> };
  readonly sessions?: { messages(limit?: number): Promise<Array<{ role: string; content: string }>>; append(text: string): Promise<null> };
  readonly models?: { complete(prompt: string, options?: { maxTokens?: number }): Promise<string> };
  readonly settings?: { get(): Promise<Record<string, unknown>> };
  readonly notifications?: { show(message: string, options?: { level?: 'info' | 'warning' | 'error' }): Promise<null> };
  readonly secrets?: { get(name: string): Promise<string | null>; set(name: string, value: string): Promise<null>; delete(name: string): Promise<null> };
  readonly ui?: { setStatus(item: string, text: string | null): Promise<null>; post(view: string, message: unknown): Promise<null> };
}

export interface Tpi2SessionContribution {
  tools?: Tpi2ToolDefinition[];
  lifecycle?: TpiLifecycleHandlers;
  ui?: {
    onMessage?(view: string, message: unknown): unknown | Promise<unknown>;
    onCommand?(command: string): unknown | Promise<unknown>;
  };
  dispose?(): void | Promise<void>;
}

export interface Tpi2PluginSpec {
  id: string;
  activate(host: Tpi2Host): Tpi2SessionContribution | Promise<Tpi2SessionContribution>;
}

declare const tpi2Brand: unique symbol;
export interface Tpi2PluginDefinition extends Tpi2PluginSpec {
  readonly [tpi2Brand]: { tpi: '2.0' };
}

/** The runtime function is supplied by globalThis.__tianshuTPI, not this type-only module. */
export function defineTianshuPlugin(spec: Tpi2PluginSpec): Tpi2PluginDefinition;
