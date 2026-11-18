// lnkib 공개 API의 요청·응답 타입. `openapi/openapi.json`에서 생성한 `generated/openapi.d.ts`를 이름으로 꺼내 쓴다.
// API가 바뀌면 `npm run openapi:sync && npm run openapi:types`로 갱신한다.
import type { components } from './generated/openapi.js';

type S = components['schemas'];

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type AppendBioLinkRequest = S['AppendBioLinkRequest'];
export type AutomationRuleDto = S['AutomationRuleDto'];
export type BioPageDto = S['BioPageDto'];
export type BioSocialType = S['BioSocialType'];
export type BookingDto = S['BookingDto'];
export type BookingProfileDto = S['BookingProfileDto'];
export type BookingStatus = S['BookingStatus'];
export type CommentRaffleRequest = S['CommentRaffleRequest'];
export type CommentRaffleResponse = S['CommentRaffleResponse'];
export type CreateHostBookingRequest = S['CreateHostBookingRequest'];
export type IgAccountDto = S['IgAccountDto'];
export type IgCommentDto = S['IgCommentDto'];
export type IgMediaDto = S['IgMediaDto'];
export type PublicApiCreateBioRequest = S['PublicApiCreateBioRequest'];
export type PublicApiUpdateBioRequest = S['PublicApiUpdateBioRequest'];
export type ToggleRuleResponse = S['ToggleRuleResponse'];
export type UpsertRuleRequest = S['UpsertRuleRequest'];
export type WebhookLogDto = S['WebhookLogDto'];
