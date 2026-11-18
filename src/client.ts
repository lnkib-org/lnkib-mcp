import type {
  ApiResponse,
  AppendBioLinkRequest,
  AutomationRuleDto,
  BioPageDto,
  BookingDto,
  BookingProfileDto,
  BookingStatus,
  CreateHostBookingRequest,
  PublicApiCreateBioRequest,
  PublicApiUpdateBioRequest,
  CommentRaffleRequest,
  CommentRaffleResponse,
  IgAccountDto,
  IgCommentDto,
  IgMediaDto,
  ToggleRuleResponse,
  UpsertRuleRequest,
  WebhookLogDto,
} from './api-types.js';

export const DEFAULT_API_BASE = 'https://api.lnkib.com';

export class LnkibApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(`[${code}] ${message}`);
    this.name = 'LnkibApiError';
  }
}

export class LnkibApiClient {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    baseUrl = DEFAULT_API_BASE,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly clientVersion = 'dev',
  ) {
    if (!apiKey.trim()) {
      throw new Error('LNKIB_API_KEY is required');
    }
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchImpl(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        // 어떤 버전의 MCP가 호출했는지 서버 로그에서 구분하기 위한 진단용 헤더
        'X-Lnkib-Client': `mcp/${this.clientVersion}`,
        ...(init?.headers ?? {}),
      },
    });

    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json || typeof json !== 'object') {
      throw new LnkibApiError(
        'INVALID_RESPONSE',
        `Unexpected non-JSON response (HTTP ${res.status})`,
        res.status,
      );
    }

    if (!json.ok) {
      throw new LnkibApiError(
        json.error?.code ?? 'API_ERROR',
        json.error?.message ?? `HTTP ${res.status}`,
        res.status,
      );
    }

    return json.data;
  }

  listAccounts(): Promise<IgAccountDto[]> {
    return this.request<IgAccountDto[]>('/api/v1/accounts');
  }

  listMedia(accountId: string): Promise<IgMediaDto[]> {
    return this.request<IgMediaDto[]>(
      `/api/v1/accounts/${encodeURIComponent(accountId)}/media`,
    );
  }

  listRules(accountId: string): Promise<AutomationRuleDto[]> {
    return this.request<AutomationRuleDto[]>(
      `/api/v1/accounts/${encodeURIComponent(accountId)}/rules`,
    );
  }

  upsertRule(
    accountId: string,
    body: Omit<UpsertRuleRequest, 'accountId'>,
  ): Promise<AutomationRuleDto> {
    return this.request<AutomationRuleDto>(
      `/api/v1/accounts/${encodeURIComponent(accountId)}/rules`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  toggleRule(ruleId: string): Promise<ToggleRuleResponse> {
    return this.request<ToggleRuleResponse>(
      `/api/v1/rules/${encodeURIComponent(ruleId)}/toggle`,
      { method: 'PATCH' },
    );
  }

  getComments(
    accountId: string,
    options?: { mediaId?: string; refresh?: boolean },
  ): Promise<IgCommentDto[]> {
    const params = new URLSearchParams();
    if (options?.mediaId) params.set('mediaId', options.mediaId);
    if (options?.refresh) params.set('refresh', 'true');
    const qs = params.toString();
    return this.request<IgCommentDto[]>(
      `/api/v1/accounts/${encodeURIComponent(accountId)}/comments${qs ? `?${qs}` : ''}`,
    );
  }

  drawCommentRaffle(
    accountId: string,
    body: CommentRaffleRequest,
  ): Promise<CommentRaffleResponse> {
    return this.request<CommentRaffleResponse>(
      `/api/v1/accounts/${encodeURIComponent(accountId)}/comments/raffle`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  getLogs(accountId: string, limit = 20): Promise<WebhookLogDto[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    return this.request<WebhookLogDto[]>(
      `/api/v1/accounts/${encodeURIComponent(accountId)}/logs?${params.toString()}`,
    );
  }
  listBioPages(): Promise<BioPageDto[]> {
    return this.request<BioPageDto[]>('/api/v1/bio');
  }

  createBioPage(body: PublicApiCreateBioRequest): Promise<BioPageDto> {
    return this.request<BioPageDto>('/api/v1/bio', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  updateBioPage(bioId: string, body: PublicApiUpdateBioRequest): Promise<BioPageDto> {
    return this.request<BioPageDto>(`/api/v1/bio/${encodeURIComponent(bioId)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  appendBioLink(bioId: string, body: AppendBioLinkRequest): Promise<BioPageDto> {
    return this.request<BioPageDto>(`/api/v1/bio/${encodeURIComponent(bioId)}/links`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  setBioPublished(bioId: string, published: boolean): Promise<BioPageDto> {
    return this.request<BioPageDto>(`/api/v1/bio/${encodeURIComponent(bioId)}/publish`, {
      method: 'POST',
      body: JSON.stringify({ published }),
    });
  }

  listBookingProfiles(): Promise<BookingProfileDto[]> {
    return this.request<BookingProfileDto[]>('/api/v1/booking-profiles');
  }

  listBookings(options?: { profileId?: string; status?: BookingStatus }): Promise<BookingDto[]> {
    const params = new URLSearchParams();
    if (options?.profileId) params.set('profileId', options.profileId);
    if (options?.status) params.set('status', options.status);
    const qs = params.toString();
    return this.request<BookingDto[]>(`/api/v1/bookings${qs ? `?${qs}` : ''}`);
  }

  createManualBooking(body: CreateHostBookingRequest): Promise<BookingDto> {
    return this.request<BookingDto>('/api/v1/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
