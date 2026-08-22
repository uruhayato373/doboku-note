import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const mcpClientModule = new URL(
  "../../.tmp/cloudflare-mcp-runtime/node_modules/@modelcontextprotocol/client/dist/index.mjs",
  import.meta.url,
);
const { Client, StreamableHTTPClientTransport } = await import(mcpClientModule);

const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneName = process.env.CLOUDFLARE_ZONE_NAME ?? "doboku-note.com";
const mcpUrl =
  process.env.CLOUDFLARE_MCP_URL ?? "https://mcp.cloudflare.com/mcp";
const outputDir =
  process.env.CLOUDFLARE_AUDIT_OUTPUT_DIR ?? ".tmp/cloudflare-mcp-audit";

await mkdir(outputDir, { recursive: true });

const client = new Client(
  { name: "doboku-note-cloudflare-audit", version: "1.0.0" },
  { versionNegotiation: { mode: "auto" } },
);
const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
  authProvider: { token: async () => token },
});

const textContent = (result) =>
  (result?.content ?? [])
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n");

const parseToolResult = (result) => {
  if (result?.structuredContent !== undefined) return result.structuredContent;

  const text = textContent(result).trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {
        // Keep the original text when the MCP server returns a human-readable result.
      }
    }
    return text;
  }
};

const toolArgumentName = (tool) => {
  const properties = tool?.inputSchema?.properties ?? {};
  if (Object.hasOwn(properties, "code")) return "code";
  if (Object.hasOwn(properties, "query")) return "query";
  return (
    tool?.inputSchema?.required?.[0] ?? Object.keys(properties)[0] ?? "code"
  );
};

const callCodeTool = async (tool, code) => {
  const result = await client.callTool({
    name: tool.name,
    arguments: { [toolArgumentName(tool)]: code },
  });

  if (result.isError) {
    throw new Error(
      `${tool.name} failed: ${textContent(result) || "unknown MCP tool error"}`,
    );
  }
  return parseToolResult(result);
};

const findSetting = (audit, id) =>
  audit?.settings?.find((setting) => setting.id === id);
const displayValue = (value) => {
  if (value === undefined || value === null || value === "")
    return "取得できず";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const rulesSummary = (ruleset) => {
  if (!ruleset) return "取得できず";
  if (ruleset.ok === false) return `取得失敗: ${ruleset.error}`;
  return `${ruleset.rules?.length ?? 0}件`;
};

const makeRecommendations = (audit, publicResponse) => {
  const recommendations = [];
  const settingLabels = {
    brotli: "Brotli圧縮",
    early_hints: "Early Hints",
    speed_brain: "Speed Brain",
    http3: "HTTP/3",
  };

  for (const [id, label] of Object.entries(settingLabels)) {
    const setting = findSetting(audit, id);
    if (setting?.value === "off")
      recommendations.push(
        `${label}が無効です。無料枠で有効化できるか確認してください。`,
      );
  }

  if (audit?.cacheRules?.ok && (audit.cacheRules.rules?.length ?? 0) === 0) {
    recommendations.push(
      "Cache Rulesが未設定です。静的アセットのTTLとブラウザーキャッシュ方針を検討してください。",
    );
  }

  if (!publicResponse?.headers?.["content-encoding"]) {
    recommendations.push(
      "トップページの応答でContent-Encodingを確認できませんでした。圧縮設定とレスポンス内容を確認してください。",
    );
  }

  return recommendations;
};

const buildMarkdown = ({
  audit,
  publicResponse,
  tools,
  recommendations,
  generatedAt,
}) => {
  const settings = [
    "brotli",
    "early_hints",
    "speed_brain",
    "http3",
    "0rtt",
    "min_tls_version",
  ];
  const lines = [
    "# Cloudflare MCP パフォーマンス監査",
    "",
    `- 実行日時: ${generatedAt}`,
    `- 対象ゾーン: ${audit?.zone?.name ?? zoneName}`,
    `- MCPツール: ${tools.join(", ")}`,
    `- プラン: ${audit?.zone?.plan ?? "取得できず"}`,
    "",
    "## Cloudflare設定",
    "",
    "| 設定 | 値 |",
    "|---|---|",
  ];

  for (const id of settings) {
    lines.push(`| ${id} | ${displayValue(findSetting(audit, id)?.value)} |`);
  }

  lines.push(
    "",
    "## Rulesets",
    "",
    `- Cache Rules: ${rulesSummary(audit?.cacheRules)}`,
    `- Compression Rules: ${rulesSummary(audit?.compressionRules)}`,
    "",
    "## 公開レスポンス",
    "",
    `- HTTPステータス: ${publicResponse?.status ?? "取得できず"}`,
    `- CF-Cache-Status: ${publicResponse?.headers?.["cf-cache-status"] ?? "なし"}`,
    `- Cache-Control: ${publicResponse?.headers?.["cache-control"] ?? "なし"}`,
    `- Content-Encoding: ${publicResponse?.headers?.["content-encoding"] ?? "なし"}`,
    `- Alt-Svc: ${publicResponse?.headers?.["alt-svc"] ?? "なし"}`,
    "",
    "## 改善候補",
    "",
  );

  if (recommendations.length === 0) {
    lines.push(
      "- 今回取得できた範囲では、明確な無効設定は見つかりませんでした。詳細はJSONレポートを確認してください。",
    );
  } else {
    lines.push(...recommendations.map((item) => `- ${item}`));
  }

  if (audit?.analytics?.ok === false) {
    lines.push("", `> Analyticsの取得に失敗しました: ${audit.analytics.error}`);
  }

  return `${lines.join("\n")}\n`;
};

let report;

try {
  if (!token) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN is required. Configure it as a GitHub Actions secret.",
    );
  }

  await client.connect(transport);
  const { tools } = await client.listTools();
  const searchTool = tools.find((tool) => tool.name === "search");
  const executeTool = tools.find((tool) => tool.name === "execute");

  if (!searchTool || !executeTool) {
    throw new Error(
      `Expected search and execute tools, received: ${tools.map((tool) => tool.name).join(", ")}`,
    );
  }

  const searchResult = await callCodeTool(
    searchTool,
    `async () => {
      const spec = await codemode.spec();
      const terms = ["/zones", "/settings/", "/rulesets/phases/", "/analytics/"];
      return Object.entries(spec.paths)
        .filter(([apiPath]) => terms.some((term) => apiPath.includes(term)))
        .slice(0, 120)
        .map(([apiPath, operations]) => ({ path: apiPath, methods: Object.keys(operations) }));
    }`,
  );

  const audit = await callCodeTool(
    executeTool,
    `async () => {
      const safe = async (path, query) => {
        try {
          return { ok: true, data: await codemode.request({ method: "GET", path, query }) };
        } catch (error) {
          return { ok: false, error: String(error?.message ?? error) };
        }
      };
      const summarizeRuleset = (response) => {
        if (!response.ok) return response;
        const result = response.data?.result ?? response.data;
        return {
          ok: true,
          id: result?.id ?? null,
          name: result?.name ?? null,
          phase: result?.phase ?? null,
          rules: (result?.rules ?? []).map((rule) => ({
            id: rule.id,
            description: rule.description ?? "",
            action: rule.action,
            enabled: rule.enabled,
            expression: rule.expression,
          })),
        };
      };

      const zonesResponse = await codemode.request({
        method: "GET",
        path: "/zones",
        query: { name: ${JSON.stringify(zoneName)}, status: "active", per_page: 1 },
      });
      const zone = (zonesResponse?.result ?? zonesResponse)?.[0];
      if (!zone) throw new Error("Active zone not found: ${zoneName.replaceAll('"', '\\"')}");

      const settingIds = ["brotli", "early_hints", "speed_brain", "http3", "0rtt", "min_tls_version"];
      const settings = [];
      for (const id of settingIds) {
        const response = await safe(\`/zones/\${zone.id}/settings/\${id}\`);
        const value = response.data?.result ?? response.data;
        settings.push(response.ok
          ? { id, value: value?.value, editable: value?.editable, modifiedOn: value?.modified_on ?? null }
          : { id, error: response.error });
      }

      const cacheRules = summarizeRuleset(await safe(\`/zones/\${zone.id}/rulesets/phases/http_request_cache_settings/entrypoint\`));
      const compressionRules = summarizeRuleset(await safe(\`/zones/\${zone.id}/rulesets/phases/http_response_compression/entrypoint\`));
      const analyticsResponse = await safe(\`/zones/\${zone.id}/analytics/dashboard\`, { since: -10080, continuous: true });
      const analyticsData = analyticsResponse.data?.result ?? analyticsResponse.data;
      const analytics = analyticsResponse.ok
        ? {
            ok: true,
            totals: analyticsData?.totals ?? null,
            timeseriesPoints: Array.isArray(analyticsData?.timeseries) ? analyticsData.timeseries.length : null,
          }
        : analyticsResponse;

      return {
        zone: {
          id: zone.id,
          name: zone.name,
          status: zone.status,
          plan: zone.plan?.name ?? null,
        },
        settings,
        cacheRules,
        compressionRules,
        analytics,
      };
    }`,
  );

  const response = await fetch(`https://${zoneName}/`, {
    headers: {
      "Accept-Encoding": "br, gzip",
      "User-Agent": "doboku-note-cloudflare-mcp-audit/1.0",
    },
    redirect: "follow",
  });
  await response.body?.cancel();

  const headerNames = [
    "cf-cache-status",
    "cache-control",
    "content-encoding",
    "vary",
    "alt-svc",
    "cf-ray",
    "server",
  ];
  const publicResponse = {
    url: response.url,
    status: response.status,
    headers: Object.fromEntries(
      headerNames.map((name) => [name, response.headers.get(name)]),
    ),
  };
  const generatedAt = new Date().toISOString();
  const recommendations = makeRecommendations(audit, publicResponse);

  report = {
    generatedAt,
    zoneName,
    mcp: {
      url: mcpUrl,
      server: client.getServerVersion(),
      protocolEra: client.getProtocolEra(),
      tools: tools.map((tool) => ({
        name: tool.name,
        inputKeys: Object.keys(tool.inputSchema?.properties ?? {}),
      })),
    },
    discovery: searchResult,
    audit,
    publicResponse,
    recommendations,
  };

  const markdown = buildMarkdown({
    audit,
    publicResponse,
    tools: tools.map((tool) => tool.name),
    recommendations,
    generatedAt,
  });

  await Promise.all([
    writeFile(
      path.join(outputDir, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    ),
    writeFile(path.join(outputDir, "report.md"), markdown, "utf8"),
  ]);
  process.stdout.write(markdown);
} catch (error) {
  const generatedAt = new Date().toISOString();
  const message = String(error?.message ?? error);
  const markdown = `# Cloudflare MCP パフォーマンス監査\n\n> 監査に失敗しました: ${message}\n`;
  report = { generatedAt, zoneName, mcpUrl, error: message };
  await Promise.all([
    writeFile(
      path.join(outputDir, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    ),
    writeFile(path.join(outputDir, "report.md"), markdown, "utf8"),
  ]);
  throw error;
} finally {
  await transport.terminateSession().catch(() => {});
  await client.close().catch(() => {});
}
