// 운영 공개 API의 OpenAPI 명세를 가져와 openapi/openapi.json을 갱신한다.
//   node scripts/sync-openapi.mjs          # 파일 갱신 (그다음 npm run openapi:types)
//   node scripts/sync-openapi.mjs --check  # 로컬 파일이 운영 명세와 같은지 확인(다르면 종료 코드 1)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const URL_SPEC = process.env.LNKIB_OPENAPI_URL ?? 'https://api.lnkib.com/api/v1/openapi.json';
const target = fileURLToPath(new URL('../openapi/openapi.json', import.meta.url));

const res = await fetch(URL_SPEC);
if (!res.ok) {
  console.error(`Failed to fetch ${URL_SPEC}: HTTP ${res.status}`);
  process.exit(2);
}
const fresh = `${JSON.stringify(await res.json(), null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = await readFile(target, 'utf8').catch(() => '');
  if (current !== fresh) {
    console.error('openapi/openapi.json differs from the live API. The API changed: run `npm run openapi:sync && npm run openapi:types`, review the diff, update tools if needed and bump the version.');
    process.exit(1);
  }
  console.log('openapi/openapi.json matches the live API');
} else {
  await writeFile(target, fresh);
  console.log(`wrote ${target}`);
}
