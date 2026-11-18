import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LnkibApiClient, LnkibApiError } from './client.js';
import { createLnkibMcpServer } from './server.js';

describe('LnkibApiClient & MCP server', () => {
  it('sends X-API-Key header and unwraps ok responses', async () => {
    let capturedUrl = '';
    let capturedKey = '';
    const mockFetch: typeof fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedKey = (init?.headers as Record<string, string>)['X-API-Key'] ?? '';
      return new Response(
        JSON.stringify({ ok: true, data: [{ id: 'acc-1', handle: 'demo' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const client = new LnkibApiClient(
      'iflow_live_test123',
      'https://api.example.test/',
      mockFetch,
    );
    const accounts = await client.listAccounts();
    assert.equal(capturedUrl, 'https://api.example.test/api/v1/accounts');
    assert.equal(capturedKey, 'iflow_live_test123');
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].handle, 'demo');
  });

  it('throws LnkibApiError on failed API envelope', async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Missing scope' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );

    const client = new LnkibApiClient(
      'iflow_live_test123',
      'https://api.example.test',
      mockFetch,
    );

    await assert.rejects(
      () => client.listAccounts(),
      (err: unknown) =>
        err instanceof LnkibApiError &&
        err.code === 'FORBIDDEN' &&
        err.status === 403,
    );
  });

  it('creates an McpServer instance without throwing', () => {
    const client = new LnkibApiClient('iflow_live_test123');
    const server = createLnkibMcpServer(client);
    assert.ok(server);
  });
});

describe('bio and booking tools over MCP', () => {
  it('lists the new tools with correct read/write hints and never offers a publish flag on create', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    const mockFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), method: init?.method, body: init?.body as string | undefined });
      return new Response(JSON.stringify({ ok: true, data: { id: 'b1', isPublished: false } }), { status: 200 });
    };
    const server = createLnkibMcpServer(new LnkibApiClient('iflow_live_test', 'https://api.test', mockFetch));
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const { tools } = await client.listTools();
    const byName = new Map(tools.map((t) => [t.name, t]));
    for (const name of ['list_bio_pages', 'create_bio_page', 'update_bio_page', 'append_bio_link', 'set_bio_published', 'list_booking_profiles', 'list_bookings', 'create_manual_booking']) {
      assert.ok(byName.has(name), `missing tool ${name}`);
    }
    assert.equal(byName.get('list_bio_pages')?.annotations?.readOnlyHint, true);
    assert.equal(byName.get('list_bookings')?.annotations?.readOnlyHint, true);
    assert.notEqual(byName.get('create_manual_booking')?.annotations?.readOnlyHint, true);
    assert.equal(byName.get('set_bio_published')?.annotations?.destructiveHint, true);
    assert.equal('isPublished' in ((byName.get('create_bio_page')?.inputSchema as { properties?: object }).properties ?? {}), false);

    await client.callTool({ name: 'create_bio_page', arguments: { slug: 'mina', displayName: 'Mina', socials: [{ type: 'tiktok', url: 'https://tiktok.com/@mina' }] } });
    await client.callTool({ name: 'update_bio_page', arguments: { bioId: 'b/1', displayName: 'Mina B' } });
    await client.callTool({ name: 'set_bio_published', arguments: { bioId: 'b1', published: true } });
    await client.callTool({ name: 'list_bookings', arguments: { status: 'PENDING', profileId: 'p1' } });
    await client.callTool({ name: 'create_manual_booking', arguments: { customerName: 'Jia', bookingDate: '2026-11-20', startTime: '14:00', durationMinutes: 30 } });

    assert.deepEqual(calls.map((c) => `${c.method ?? 'GET'} ${c.url.replace('https://api.test', '')}`), [
      'POST /api/v1/bio',
      'PUT /api/v1/bio/b%2F1',
      'POST /api/v1/bio/b1/publish',
      'GET /api/v1/bookings?profileId=p1&status=PENDING',
      'POST /api/v1/bookings',
    ]);
    assert.equal(JSON.parse(calls[2].body ?? '{}').published, true);
    assert.equal(JSON.parse(calls[4].body ?? '{}').status, 'CONFIRMED');
    await client.close();
  });
});
