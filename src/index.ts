#!/usr/bin/env node
import { createRequire } from 'node:module';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DEFAULT_API_BASE, LnkibApiClient } from './client.js';
import { createLnkibMcpServer } from './server.js';

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

async function main(): Promise<void> {
  const apiKey = process.env.LNKIB_API_KEY?.trim();
  if (!apiKey) {
    console.error('Error: LNKIB_API_KEY environment variable is required.');
    process.exit(1);
  }

  const baseUrl = process.env.LNKIB_API_BASE?.trim() || DEFAULT_API_BASE;
  const client = new LnkibApiClient(apiKey, baseUrl, fetch, version);
  const server = createLnkibMcpServer(client, version);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((err) => {
  console.error('lnkib MCP server failed:', err);
  process.exit(1);
});
