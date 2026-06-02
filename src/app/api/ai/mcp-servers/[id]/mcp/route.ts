import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const clientNameCache = new Map<string, string>();

function buildHeaders(server: any) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": BROWSER_UA,
    "Accept": "application/json, text/event-stream",
  };
  if (server.apiKey) {
    if (server.type === "openai") headers["Authorization"] = `Bearer ${server.apiKey}`;
    else if (server.type === "anthropic") headers["x-api-key"] = server.apiKey;
    else if (server.type === "custom") headers["x-api-key"] = server.apiKey;
    else headers["Authorization"] = `Bearer ${server.apiKey}`;
  }
  return headers;
}

function parseMcpResponse(rawText: string): any {
  try { return JSON.parse(rawText); } catch {}
  const dataLines: string[] = [];
  for (const line of rawText.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data: ")) {
      dataLines.push(trimmed.slice(6));
    }
  }
  if (dataLines.length > 0) {
    const joined = dataLines.join("");
    try { return JSON.parse(joined); } catch {}
    for (const dl of dataLines) {
      try { return JSON.parse(dl); } catch {}
    }
  }
  return { raw: rawText.substring(0, 3000) };
}

async function evaluatePolicy(server: any, text: string, serverId: string, start: number): Promise<{ blocked: boolean; reason?: string; ruleName?: string }> {
  if (!server.policyId) return { blocked: false };
  const policy = await prisma.aiPolicy.findUnique({ where: { id: server.policyId } });
  if (!policy?.enabled) return { blocked: false };

  const rules = typeof policy.rules === "string" ? JSON.parse(policy.rules) : (policy.rules || []);
  for (const rule of rules) {
    if (rule.type === "block_keywords" && rule.keywords?.length) {
      for (const keyword of rule.keywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          await prisma.mcpLog.create({
            data: {
              serverId,
              request: text.substring(0, 2000),
              response: null,
              status: "blocked",
              policyEval: JSON.stringify({ blockedBy: rule.name, keyword, reason: `Matched keyword "${keyword}" from rule: ${rule.name}` }),
              duration: Date.now() - start,
              userAgent: clientNameCache.get(serverId) || "MCP Client",
            },
          });
          return { blocked: true, reason: `Matched keyword "${keyword}"`, ruleName: rule.name };
        }
      }
    }
  }
  return { blocked: false };
}

function extractTextForPolicyCheck(args: any): string {
  const parts: string[] = [];
  if (typeof args === "string") return args;
  if (typeof args === "object") {
    for (const val of Object.values(args)) {
      if (typeof val === "string") parts.push(val);
    }
  }
  return parts.join(" ");
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const server = await prisma.mcpServer.findUnique({ where: { id: params.id } });
  if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });

  let body: any = {};
  let rawBody = "";
  try {
    const cloned = request.clone();
    rawBody = await cloned.text();
    body = JSON.parse(rawBody);
  } catch { body = {}; }
  const start = Date.now();
  const dbg = `[MCP] method=${body?.method} jsonrpc=${body?.jsonrpc} bodyLen=${rawBody.length}`;
  console.log(dbg);

  // Handle empty/malformed probe requests from ChatGPT during connection setup
  const EMPTY_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin",
  };
  if (!rawBody.trim() || !body?.method) {
    console.log(`[MCP] Empty/probe body, returning init response`);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "Exa Search", version: "1.0.0" },
      },
    }, { headers: EMPTY_CORS });
  }

  // Detect format: standard MCP JSON-RPC or UI format
  const isStandardMcp = body?.jsonrpc === "2.0" && body?.method;
  const method: string = body?.method || "tools/call";
  const mcpParams = body?.params || {};
  const rpcId = body?.id ?? 1;

  // Use JSON for POST (request-response), SSE only for GET (streaming)
  const acceptHeader = request.headers.get("accept") || "";
  const wantsSse = false;

  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin",
  };

  function respond(data: any, status = 200) {
    if (wantsSse) {
      const body = `event: message\ndata: ${JSON.stringify(data)}\n\n`;
      return new NextResponse(body, {
        status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          ...CORS_HEADERS,
        },
      });
    }
    return NextResponse.json(data, { status, headers: CORS_HEADERS });
  }

  // Handle MCP notifications (JSON-RPC notifications MUST NOT get a response)
  if (method.startsWith("notifications/")) {
    if (isStandardMcp) {
      return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
    }
    return respond({ ok: true });
  }

  // Handle MCP initialize handshake
  if (method === "initialize") {
    prisma.mcpServer.update({ where: { id: params.id }, data: { status: "connected" } }).catch(() => {});
    const clientName = mcpParams?.clientInfo?.name || "unknown";
    if (clientName !== "unknown") clientNameCache.set(params.id, clientName);
    console.log(`[MCP INIT] client=${clientName} proto=${mcpParams?.protocolVersion}`);
    if (!isStandardMcp) return respond({ ok: true });
    return respond({
      jsonrpc: "2.0",
      result: {
        protocolVersion: mcpParams?.protocolVersion || "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "Exa Search", version: "1.0.0" },
      },
      id: rpcId,
    });
  }

  // Handle ping (health check)
  if (method === "ping") {
    if (isStandardMcp) {
      return respond({ jsonrpc: "2.0", result: {}, id: rpcId });
    }
    return respond({ ok: true });
  }

  // Handle unsupported methods gracefully (resources/list, prompts/list, etc.)
  if (!["initialize", "tools/list", "tools/call"].includes(method)) {
    if (isStandardMcp) {
      if (method.startsWith("resources/") || method.startsWith("prompts/") || method.startsWith("sampling/")) {
        return respond({ jsonrpc: "2.0", result: method.startsWith("resources/") ? { resources: [] } : {}, id: rpcId });
      }
      return respond({ jsonrpc: "2.0", result: {}, id: rpcId });
    }
    return respond({ ok: false, error: `Method not supported: ${method}` }, 400);
  }

  // Extract tool name and arguments from the appropriate format
  let toolName: string;
  let toolArgs: any;
  if (method === "tools/call") {
    if (isStandardMcp) {
      toolName = mcpParams?.name || "";
      toolArgs = mcpParams?.arguments || {};
    } else {
      toolName = body.toolName || method.replace("tools/", "");
      toolArgs = mcpParams;
    }

    // Policy check on tool arguments
    const checkText = extractTextForPolicyCheck(toolArgs);
    const policyCheck = await evaluatePolicy(server, `${toolName} ${checkText}`, params.id, start);
    if (policyCheck.blocked) {
      if (isStandardMcp) {
        return respond({
          jsonrpc: "2.0",
          error: { code: -32001, message: `Blocked by policy: ${policyCheck.reason}` },
          id: rpcId,
        }, 403);
      }
      return respond({
        ok: false,
        error: `Blocked by policy: ${policyCheck.reason}`,
        blocked: true,
        rule: policyCheck.ruleName,
        duration: Date.now() - start,
      }, 403);
    }
  } else {
    toolName = "";
    toolArgs = {};
  }

  // Build the MCP request to forward to the real server
  const mcpRequest: any = {
    jsonrpc: "2.0",
    method,
    params: method === "tools/call"
      ? { name: toolName, arguments: toolArgs }
      : mcpParams,
    id: rpcId,
  };

  const requestLog = JSON.stringify(mcpRequest, null, 2);

  try {
    const response = await fetch(server.url, {
      method: "POST",
      headers: buildHeaders(server),
      body: JSON.stringify(mcpRequest),
      signal: AbortSignal.timeout(30000),
    });

    const rawText = await response.text();
    const duration = Date.now() - start;
    let result = parseMcpResponse(rawText);

    // Sanitize tool schemas for ChatGPT compatibility
    if (result?.result?.tools && Array.isArray(result.result.tools)) {
      const KEEP = new Set(["type", "description", "items", "enum", "required", "default"]);
      function cleanSchema(s: any): any {
        if (!s || typeof s !== "object") return s;
        if (Array.isArray(s)) return s.map(cleanSchema);
        const out: any = {};
        for (const [k, v] of Object.entries(s)) {
          if (k === "properties") {
            const cleaned: any = {};
            for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) cleaned[pk] = cleanSchema(pv);
            out[k] = cleaned;
          } else if (KEEP.has(k)) {
            out[k] = cleanSchema(v);
          }
        }
        return out;
      }
      result.result.tools = result.result.tools.map((tool: any) => {
        const { execution, ...rest } = tool;
        return {
          ...rest,
          inputSchema: tool.inputSchema ? cleanSchema(tool.inputSchema) : undefined,
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        };
      });
    }

    const hasRpcError = result?.error != null;
    const logStatus = hasRpcError ? "error" : response.ok ? "success" : "error";
    const responseLog = JSON.stringify(result, null, 2).substring(0, 10000);

    // Policy check on response content
    const responseText = result?.result?.content?.map((c: any) => c.text || "").join(" ") ||
                         JSON.stringify(result).substring(0, 5000);
    const responsePolicy = await evaluatePolicy(server, responseText, params.id, start);
    if (responsePolicy.blocked) {
      if (isStandardMcp) {
        return respond({
          jsonrpc: "2.0",
          error: { code: -32002, message: `Response blocked by policy: ${responsePolicy.reason}` },
          id: rpcId,
        });
      }
      return respond({
        ok: false,
        error: `Response blocked by policy: ${responsePolicy.reason}`,
        blocked: true,
        rule: responsePolicy.ruleName,
        duration,
      });
    }

    await prisma.mcpLog.create({
      data: {
        serverId: params.id,
        request: requestLog,
        response: responseLog,
        status: logStatus,
        duration,
        userAgent: isStandardMcp ? (clientNameCache.get(params.id) || "MCP Client") : `MCP Bridge (${server.type})`,
      },
    });

    // Return in the appropriate format
    if (isStandardMcp) {
      if (result?.result || result?.error) {
        return respond({ ...result, id: rpcId });
      }
      return respond({
        jsonrpc: "2.0",
        result: result?.result || result,
        id: rpcId,
      });
    }

    return respond({
      ok: !hasRpcError && response.ok,
      result,
      duration,
    });
  } catch (err: any) {
    const duration = Date.now() - start;
    await prisma.mcpLog.create({
      data: {
        serverId: params.id,
        request: requestLog,
        response: `Error: ${err.message}`,
        status: "error",
        duration,
        userAgent: clientNameCache.get(params.id) || `MCP Bridge (${server.type})`,
      },
    });

    if (isStandardMcp) {
      return respond({
        jsonrpc: "2.0",
        error: { code: -32603, message: err.message },
        id: rpcId,
      }, 500);
    }
    return respond({ ok: false, error: err.message, duration }, 500);
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const server = await prisma.mcpServer.findUnique({ where: { id: params.id } });
  if (!server) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const acceptHeader = request.headers.get("accept") || "";

  // If client requests SSE, return an SSE endpoint that responds to tools/list
  if (acceptHeader.includes("text/event-stream")) {
    try {
      const mcpResponse = await fetch(server.url, {
        method: "POST",
        headers: buildHeaders(server),
        body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", params: {}, id: 1 }),
        signal: AbortSignal.timeout(15000),
      });

      const rawText = await mcpResponse.text();
      const data = parseMcpResponse(rawText);
      let result = data?.result || { tools: [] };
      if (result.tools && Array.isArray(result.tools)) {
        const KEEP = new Set(["type", "description", "items", "enum", "required", "default"]);
        function cleanSchema(s: any): any {
          if (!s || typeof s !== "object") return s;
          if (Array.isArray(s)) return s.map(cleanSchema);
          const out: any = {};
          for (const [k, v] of Object.entries(s)) {
          if (k === "properties") {
            const cleaned: any = {};
            for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) cleaned[pk] = cleanSchema(pv);
              out[k] = cleaned;
            } else if (KEEP.has(k)) {
              out[k] = cleanSchema(v);
            }
          }
          return out;
        }
        result.tools = result.tools.map((tool: any) => {
          const { execution, ...rest } = tool;
          return {
            ...rest,
            inputSchema: tool.inputSchema ? cleanSchema(tool.inputSchema) : undefined,
            annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
          };
        });
      }
      const body = `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", result, id: 1 })}\n\n`;

      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err: any) {
      const body = `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: err.message }, id: 1 })}\n\n`;
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }

  try {
    const response = await fetch(server.url, {
      method: "POST",
      headers: buildHeaders(server),
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", params: {}, id: 1 }),
      signal: AbortSignal.timeout(15000),
    });

    const rawText = await response.text();
    const data = parseMcpResponse(rawText);
    const raw = { ...data };
    if (raw?.result?.tools && Array.isArray(raw.result.tools)) {
      const KEEP = new Set(["type", "description", "items", "enum", "required", "default"]);
      function cleanSchema(s: any): any {
        if (!s || typeof s !== "object") return s;
        if (Array.isArray(s)) return s.map(cleanSchema);
        const out: any = {};
        for (const [k, v] of Object.entries(s)) {
          if (k === "properties") {
            const cleaned: any = {};
            for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) cleaned[pk] = cleanSchema(pv);
            out[k] = cleaned;
          } else if (KEEP.has(k)) {
            out[k] = cleanSchema(v);
          }
        }
        return out;
      }
      raw.result.tools = raw.result.tools.map((tool: any) => {
        const { execution, ...rest } = tool;
        return {
          ...rest,
          inputSchema: tool.inputSchema ? cleanSchema(tool.inputSchema) : undefined,
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        };
      });
    }

    const tools = raw?.result?.tools || [];
    const error = data?.error || (response.ok ? null : { message: `HTTP ${response.status}`, status: response.status });

    return NextResponse.json({ tools, error, raw, ok: !error && response.ok });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, tools: [], ok: false }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin",
      "Access-Control-Max-Age": "86400",
    },
  });
}
