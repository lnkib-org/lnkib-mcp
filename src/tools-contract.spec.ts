import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { LnkibApiClient } from './client.js';
import { createLnkibMcpServer } from './server.js';

// 도구 계약(이름·읽기/쓰기 힌트·입력 필드)을 커밋된 스냅샷과 비교한다.
// 계약이 바뀌면 이 테스트가 실패하므로 의도한 변경인지 확인하고, 버전을 올리고(CHANGELOG 기록) 스냅샷을 갱신한다:
//   pnpm --filter @lnkib/mcp test:update-contract
// 필드 삭제·이름 변경·필수 전환·도구 삭제는 major, 도구·선택 필드 추가는 minor.
const CONTRACT_PATH = fileURLToPath(new URL('../src/tools.contract.json', import.meta.url));

type ToolContract = { name: string; readOnly: boolean; destructive: boolean; required: string[]; fields: string[] };

async function currentContract(): Promise<ToolContract[]> {
  const server = createLnkibMcpServer(new LnkibApiClient('iflow_live_contract_test', 'https://api.test'));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'contract', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const { tools } = await client.listTools();
  await client.close();
  return tools
    .map((t) => {
      const schema = t.inputSchema as { properties?: Record<string, unknown>; required?: string[] };
      return {
        name: t.name,
        readOnly: t.annotations?.readOnlyHint === true,
        destructive: t.annotations?.destructiveHint === true,
        required: [...(schema.required ?? [])].sort(),
        fields: Object.keys(schema.properties ?? {}).sort(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

describe('MCP tools contract', () => {
  it('matches the committed snapshot (bump the version and update it on purpose)', async () => {
    const actual = await currentContract();
    if (process.env.UPDATE_TOOLS_CONTRACT === '1') {
      await writeFile(CONTRACT_PATH, `${JSON.stringify(actual, null, 2)}\n`);
      return;
    }
    const expected = JSON.parse(await readFile(CONTRACT_PATH, 'utf8')) as ToolContract[];
    assert.deepEqual(actual, expected, 'Tool contract changed. If intended, bump the version, update CHANGELOG.md and run test:update-contract.');
  });

  it('keeps write tools clearly separated from read-only tools', async () => {
    const tools = await currentContract();
    for (const name of ['list_accounts', 'list_media', 'list_rules', 'get_comments', 'get_logs', 'list_bio_pages', 'list_booking_profiles', 'list_bookings']) {
      assert.equal(tools.find((t) => t.name === name)?.readOnly, true, `${name} must stay read-only`);
    }
    for (const name of ['create_bio_page', 'update_bio_page', 'append_bio_link', 'set_bio_published', 'create_manual_booking', 'upsert_rule']) {
      assert.equal(tools.find((t) => t.name === name)?.readOnly, false, `${name} must not be marked read-only`);
    }
    assert.ok(!tools.find((t) => t.name === 'create_bio_page')?.fields.includes('isPublished'));
  });
});
