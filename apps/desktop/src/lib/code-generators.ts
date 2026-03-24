import type { Tab } from "@apiark/types";

/** Clean up a GraphQL JSON body: collapse \r\n and consecutive whitespace in the query string */
function cleanGraphQLBody(body: string): string {
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed.query === "string") {
      parsed.query = parsed.query
        .replace(/\r\n/g, " ")
        .replace(/\n/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // not valid JSON, return as-is
  }
  return body;
}

export function generateCurl(tab: Tab): string {
  const parts = [`curl -X ${tab.method}`];
  // URL already contains query params (synced from Params tab)
  parts.push(`'${tab.url}'`);

  for (const h of tab.headers) {
    if (h.key.trim() && h.enabled) {
      parts.push(`-H '${h.key}: ${h.value}'`);
    }
  }

  if (tab.auth.type === "bearer") {
    parts.push(`-H 'Authorization: Bearer ${tab.auth.token}'`);
  } else if (tab.auth.type === "basic") {
    parts.push(`-u '${tab.auth.username}:${tab.auth.password}'`);
  } else if (tab.auth.type === "api-key" && tab.auth.addTo === "header") {
    parts.push(`-H '${tab.auth.key}: ${tab.auth.value}'`);
  }

  if (tab.body.type !== "none" && tab.body.content.trim()) {
    const content = tab.body.type === "json" ? cleanGraphQLBody(tab.body.content) : tab.body.content;
    const escaped = content.replace(/'/g, "'\\''");
    parts.push(`-d '${escaped}'`);
  }

  return parts.join(" \\\n  ");
}

export function generateJsFetch(tab: Tab): string {
  // URL already contains query params (synced from Params tab)
  const url = tab.url;

  const headers: Record<string, string> = {};
  for (const h of tab.headers) {
    if (h.key.trim() && h.enabled) {
      headers[h.key] = h.value;
    }
  }

  if (tab.auth.type === "bearer") {
    headers["Authorization"] = `Bearer ${tab.auth.token}`;
  } else if (tab.auth.type === "basic") {
    headers["Authorization"] = `Basic ${btoa(`${tab.auth.username}:${tab.auth.password}`)}`;
  } else if (tab.auth.type === "api-key" && tab.auth.addTo === "header") {
    headers[tab.auth.key] = tab.auth.value;
  }

  const hasHeaders = Object.keys(headers).length > 0;
  const hasBody = tab.body.type !== "none" && tab.body.content.trim();

  const options: string[] = [];
  options.push(`  method: "${tab.method}",`);

  if (hasHeaders) {
    options.push(`  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, "\n  ")},`);
  }

  if (hasBody) {
    if (tab.body.type === "json") {
      const content = cleanGraphQLBody(tab.body.content).trim();
      options.push(`  body: JSON.stringify(${content}),`);
    } else {
      options.push(`  body: ${JSON.stringify(tab.body.content)},`);
    }
  }

  const lines = [
    `const response = await fetch("${url}", {`,
    ...options,
    `});`,
    ``,
    `const data = await response.json();`,
    `console.log(data);`,
  ];

  return lines.join("\n");
}

export function generatePythonRequests(tab: Tab): string {
  const headers: Record<string, string> = {};
  for (const h of tab.headers) {
    if (h.key.trim() && h.enabled) {
      headers[h.key] = h.value;
    }
  }

  if (tab.auth.type === "bearer") {
    headers["Authorization"] = `Bearer ${tab.auth.token}`;
  } else if (tab.auth.type === "api-key" && tab.auth.addTo === "header") {
    headers[tab.auth.key] = tab.auth.value;
  }

  const lines = ["import requests", ""];

  // URL already contains query params (synced from Params tab)
  lines.push(`url = "${tab.url}"`);

  if (Object.keys(headers).length > 0) {
    lines.push(`headers = ${pythonDict(headers)}`);
  }

  const hasBody = tab.body.type !== "none" && tab.body.content.trim();
  if (hasBody) {
    if (tab.body.type === "json") {
      const content = cleanGraphQLBody(tab.body.content).trim();
      lines.push(`json_data = ${content}`);
    } else {
      lines.push(`data = ${JSON.stringify(tab.body.content)}`);
    }
  }

  // Build the request call
  const args = [`url`];
  if (Object.keys(headers).length > 0) args.push("headers=headers");
  if (hasBody) {
    args.push(tab.body.type === "json" ? "json=json_data" : "data=data");
  }
  if (tab.auth.type === "basic") {
    args.push(`auth=("${tab.auth.username}", "${tab.auth.password}")`);
  }

  lines.push("");
  lines.push(`response = requests.${tab.method.toLowerCase()}(${args.join(", ")})`);
  lines.push(`print(response.status_code)`);
  lines.push(`print(response.json())`);

  return lines.join("\n");
}

function pythonDict(obj: Record<string, string>): string {
  const entries = Object.entries(obj).map(([k, v]) => `    "${k}": "${v}"`);
  return `{\n${entries.join(",\n")}\n}`;
}
