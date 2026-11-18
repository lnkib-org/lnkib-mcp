import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BioSocialType } from './api-types.js';
import { LnkibApiClient } from './client.js';

// BioSocialType에 값이 추가되면 이 Record가 컴파일 오류를 내므로 MCP 입력 목록이 항상 타입과 같다.
const SOCIAL_TYPE_SET: Record<BioSocialType, true> = {
  instagram: true,
  facebook: true,
  tiktok: true,
  threads: true,
  x: true,
  youtube: true,
  linkedin: true,
  kakao: true,
  blog: true,
  website: true,
};
const SOCIAL_TYPES = Object.keys(SOCIAL_TYPE_SET) as [BioSocialType, ...BioSocialType[]];

const socialsSchema = z
  .array(z.object({ type: z.enum(SOCIAL_TYPES), url: z.string().describe('Full https URL of the profile') }))
  .describe('Social channel icons. Each type at most once.');

const linkSchema = z.object({
  id: z.string().optional().describe('Existing link id from list_bio_pages; keep it to preserve click counts'),
  title: z.string().describe('Button title (max 80 chars)'),
  url: z.string().describe('https URL'),
  subtitle: z.string().optional(),
  badge: z.string().optional().describe('Short badge such as NEW or HOT (max 20 chars)'),
});

type LinkInput = z.infer<typeof linkSchema>;

/** 서버가 id가 없는 링크에는 새 id를 붙이고 활성 상태로 저장한다. 타입을 맞추기 위해 같은 기본값을 채운다. */
function toLinkBlocks(links: LinkInput[] | undefined) {
  return links?.map((l, i) => ({ id: l.id ?? `link-${i + 1}`, isActive: true, ...l }));
}

const bioFields = {
  displayName: z.string().describe('Display name (1-60 chars)'),
  handleLabel: z.string().optional().describe('Handle shown under the name, e.g. mina.bakes'),
  bio: z.string().optional().describe('Short intro text (max 240 chars)'),
  theme: z.enum(['light', 'dark', 'indigo']).optional(),
  avatarUrl: z.string().optional().describe('Public https image URL'),
  socials: socialsSchema.optional(),
};

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function createLnkibMcpServer(client: LnkibApiClient, version = 'dev'): McpServer {
  const server = new McpServer({
    name: 'lnkib',
    version,
  });

  server.registerTool(
    'list_accounts',
    {
      title: 'List Instagram Accounts',
      description:
        'List connected Instagram professional accounts accessible to this API key. Call this first to discover accountId UUIDs.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => jsonResult(await client.listAccounts()),
  );

  server.registerTool(
    'list_media',
    {
      title: 'List Account Media',
      description:
        'List Instagram posts and reels for an account. Requires accounts:read scope. Call list_accounts first to get accountId.',
      inputSchema: {
        accountId: z.string().describe('Instagram account UUID from list_accounts'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ accountId }) => jsonResult(await client.listMedia(accountId)),
  );

  server.registerTool(
    'list_rules',
    {
      title: 'List Automation Rules',
      description:
        'List comment/DM automation rules for an account (including per-keyword DM variants). Requires rules:read scope.',
      inputSchema: {
        accountId: z.string().describe('Instagram account UUID'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ accountId }) => jsonResult(await client.listRules(accountId)),
  );

  server.registerTool(
    'upsert_rule',
    {
      title: 'Create or Update Automation Rule',
      description:
        'Create or update an Instagram comment/DM automation rule, including per-keyword custom DM messages (keywordDmVariants). Requires rules:write scope.',
      inputSchema: {
        accountId: z.string().describe('Instagram account UUID'),
        id: z.string().optional().describe('Existing rule UUID to update; omit to create'),
        mediaId: z.string().describe('Target Instagram media ID from list_media'),
        name: z.string().describe('Human-readable rule name'),
        triggerType: z.enum(['keywords', 'all']).default('keywords'),
        keywords: z.array(z.string()).default([]).describe('Trigger keywords when triggerType is keywords'),
        enablePublicReply: z.boolean().default(true),
        publicReplies: z.array(z.string()).default([]).describe('Random public reply templates'),
        enableDm: z.boolean().default(true),
        dmMessage: z.string().default('').describe('Default DM body text'),
        dmDelayMinutes: z.number().int().min(0).max(10080).optional().describe('Optional DM delay in minutes (0-10080)'),
        enableFollowNudge: z
          .boolean()
          .optional()
          .describe('If true, send a follow-nudge DM first when the commenter is not a follower'),
        followNudgeMessage: z.string().optional().describe('Optional follow-nudge DM body'),
        ctaLabel: z.string().default('').describe('Optional CTA button label'),
        ctaUrl: z.string().default('').describe('Optional CTA link URL'),
        keywordDmVariants: z
          .array(
            z.object({
              keyword: z.string(),
              dmMessage: z.string(),
              ctaLabel: z.string().optional(),
              ctaUrl: z.string().optional(),
            }),
          )
          .optional()
          .describe('Optional per-keyword custom DM messages and CTA links'),
        isActive: z.boolean().optional(),
      },
      annotations: { destructiveHint: false },
    },
    async ({ accountId, ...ruleBody }) =>
      jsonResult(await client.upsertRule(accountId, ruleBody)),
  );

  server.registerTool(
    'toggle_rule',
    {
      title: 'Toggle Automation Rule',
      description: 'Enable or pause an automation rule by ID. Requires rules:write scope.',
      inputSchema: {
        ruleId: z.string().describe('Automation rule UUID'),
      },
      annotations: { destructiveHint: false },
    },
    async ({ ruleId }) => jsonResult(await client.toggleRule(ruleId)),
  );

  server.registerTool(
    'get_comments',
    {
      title: 'Get Account Comments',
      description:
        'Fetch collected Instagram comments for an account (or specific mediaId). Uses 5-minute cache unless refresh=true. Requires comments:read scope.',
      inputSchema: {
        accountId: z.string().describe('Instagram account UUID'),
        mediaId: z.string().optional().describe('Optional Instagram media ID filter'),
        refresh: z.boolean().optional().describe('Bypass cache (respecting 15s cooldown)'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(30)
          .describe('Max comments to return in response to keep context concise'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ accountId, mediaId, refresh, limit }) => {
      const comments = await client.getComments(accountId, { mediaId, refresh });
      return jsonResult({
        totalFetched: comments.length,
        returned: Math.min(comments.length, limit),
        comments: comments.slice(0, limit),
      });
    },
  );

  server.registerTool(
    'draw_comment_raffle',
    {
      title: 'Draw Comment Raffle Winners',
      description:
        'Randomly draw fair comment event winners for a post/reel using cryptographic randomness. Requires raffle:run scope.',
      inputSchema: {
        accountId: z.string().describe('Instagram account UUID'),
        mediaId: z.string().describe('Target Instagram media ID'),
        winnerCount: z.number().int().min(1).max(100).describe('Number of winners to draw'),
        dedupeByUser: z.boolean().optional().default(true).describe('Allow max 1 entry per user'),
        excludeSelf: z.boolean().optional().default(true).describe('Exclude own account comments'),
        keywordFilter: z.string().optional().describe('Optional required keyword in comment text'),
      },
      annotations: { destructiveHint: false },
    },
    async ({ accountId, ...body }) =>
      jsonResult(await client.drawCommentRaffle(accountId, body)),
  );

  server.registerTool(
    'get_logs',
    {
      title: 'Get Automation Logs',
      description:
        'Fetch recent webhook auto-reply and DM execution logs for an account. Requires logs:read scope.',
      inputSchema: {
        accountId: z.string().describe('Instagram account UUID'),
        limit: z.number().int().min(1).max(100).default(20),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ accountId, limit }) => jsonResult(await client.getLogs(accountId, limit)),
  );

  server.registerTool(
    'list_bio_pages',
    {
      title: 'List Link-in-Bio Pages',
      description:
        'List your Link-in-Bio pages (id, slug, links, socials, isPublished). Works without any Instagram connection. Requires bio:read scope.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => jsonResult(await client.listBioPages()),
  );

  server.registerTool(
    'create_bio_page',
    {
      title: 'Create Link-in-Bio Draft',
      description:
        'Create a new Link-in-Bio page as a PRIVATE draft (it is never published by this tool). Show the draft to the user and let them review it; publishing needs set_bio_published and the bio:publish scope. Works without any Instagram connection. Requires bio:write scope.',
      inputSchema: {
        slug: z.string().describe('Public URL slug, 2-40 chars of a-z 0-9 . _ - (shown as /b/<slug>)'),
        ...bioFields,
        links: z.array(linkSchema).max(30).optional().describe('Link buttons, in display order'),
      },
      annotations: { destructiveHint: false },
    },
    async ({ links, ...rest }) => jsonResult(await client.createBioPage({ ...rest, links: toLinkBlocks(links) })),
  );

  server.registerTool(
    'update_bio_page',
    {
      title: 'Update Link-in-Bio Page',
      description:
        'Update fields of an existing page. Only the fields you send change; the publish state is never changed here. WARNING: sending `links` or `socials` replaces the whole list, so call list_bio_pages first and send the complete list (use append_bio_link to add a single link). Requires bio:write scope.',
      inputSchema: {
        bioId: z.string().describe('Bio page UUID from list_bio_pages'),
        slug: z.string().optional(),
        displayName: bioFields.displayName.optional(),
        handleLabel: bioFields.handleLabel,
        bio: bioFields.bio,
        theme: bioFields.theme,
        avatarUrl: bioFields.avatarUrl,
        socials: bioFields.socials,
        links: z.array(linkSchema).max(30).optional().describe('Replaces ALL links when provided'),
      },
      annotations: { destructiveHint: true },
    },
    async ({ bioId, links, ...rest }) => jsonResult(await client.updateBioPage(bioId, { ...rest, links: toLinkBlocks(links) })),
  );

  server.registerTool(
    'append_bio_link',
    {
      title: 'Append Bio Link',
      description: 'Add one link button to an existing page without touching the others. Requires bio:write scope.',
      inputSchema: {
        bioId: z.string().describe('Bio page UUID'),
        title: z.string(),
        url: z.string().describe('https URL'),
        subtitle: z.string().optional(),
        badge: z.string().optional(),
        position: z.enum(['top', 'bottom']).optional().default('bottom'),
      },
      annotations: { destructiveHint: false },
    },
    async ({ bioId, ...body }) => jsonResult(await client.appendBioLink(bioId, body)),
  );

  server.registerTool(
    'set_bio_published',
    {
      title: 'Publish or Unpublish Bio Page',
      description:
        'Make a page public at /b/<slug> or private again. This exposes content on the internet: only call it after the user explicitly approved publishing. Requires bio:publish scope.',
      inputSchema: {
        bioId: z.string().describe('Bio page UUID'),
        published: z.boolean().describe('true = public, false = private'),
      },
      annotations: { destructiveHint: true },
    },
    async ({ bioId, published }) => jsonResult(await client.setBioPublished(bioId, published)),
  );

  server.registerTool(
    'list_booking_profiles',
    {
      title: 'List Booking Pages',
      description:
        'List your booking pages (hours, slot length, capacity). Works without any Instagram connection. Requires bookings:read scope.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => jsonResult(await client.listBookingProfiles()),
  );

  server.registerTool(
    'list_bookings',
    {
      title: 'List Bookings',
      description:
        'List bookings (newest first, max 200). The result contains customer names and contact details: treat it as personal data and do not share it beyond what the user asked. Requires bookings:read scope.',
      inputSchema: {
        profileId: z.string().optional().describe('Booking page UUID from list_booking_profiles'),
        status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ profileId, status }) => jsonResult(await client.listBookings({ profileId, status })),
  );

  server.registerTool(
    'create_manual_booking',
    {
      title: 'Add a Manual Booking',
      description:
        'Register a phone or walk-in booking. Hours, open days, capacity and past dates are NOT enforced, and no message is sent to the customer. Defaults to CONFIRMED. Works without a booking page or Instagram connection. Requires bookings:write scope.',
      inputSchema: {
        profileId: z.string().optional().describe('Booking page UUID; omit to use your own default'),
        customerName: z.string().describe('Customer name (required)'),
        customerContact: z.string().optional(),
        customerIgHandle: z.string().optional(),
        bookingDate: z.string().describe('YYYY-MM-DD'),
        startTime: z.string().describe('HH:mm (24h)'),
        durationMinutes: z.number().int().min(5).max(720).optional().describe('Length in minutes; default is the page slot length'),
        status: z.enum(['PENDING', 'CONFIRMED']).optional().default('CONFIRMED'),
        note: z.string().optional(),
      },
      annotations: { destructiveHint: false },
    },
    async (body) => jsonResult(await client.createManualBooking(body)),
  );

  return server;
}
