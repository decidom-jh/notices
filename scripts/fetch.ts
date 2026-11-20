// 공고 받기 (2026-11-20). 하루 한 번 돌려서 data/*.json을 새로 써요(GitHub Actions: .github/workflows/daily.yml).
// 돌리기: DATA_GO_KR_KEY=… BIZINFO_KEY=… deno run --allow-net --allow-env --allow-read --allow-write scripts/fetch.ts
// 키가 없는 곳은 건너뛰고, 받기에 실패한 곳은 지난 파일을 그대로 둬요(빈 목록으로 덮지 않아요).
import { bizinfoRows, examRows, keepOpen, kstartupRows, serviceRows, type Exam, type Service, type Support } from "./parse.ts";

const TIMEOUT_MS = 20000;
const OUT = new URL("../data/", import.meta.url);
const env = (n: string) => Deno.env.get(n) ?? "";
/** 한국 날짜 */
const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

async function getJson(url: string): Promise<unknown> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) {
      console.warn(`  ${new URL(url).host} ${r.status}`);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.warn(`  ${new URL(url).host} 실패`, String(e).slice(0, 100));
    return null;
  } finally {
    clearTimeout(t);
  }
}

type Status = { ok: boolean; count: number; note?: string };
const status: Record<string, Status> = {};

/** 받은 게 있으면 쓰고, 없으면 지난 파일을 둬요 */
async function save<T>(name: string, list: T[] | null, note?: string) {
  if (list === null) {
    status[name] = { ok: false, count: 0, note: note ?? "키 없음" };
    return;
  }
  if (!list.length) {
    status[name] = { ok: false, count: 0, note: note ?? "받은 것 없음(지난 파일 그대로)" };
    return;
  }
  await Deno.writeTextFile(new URL(`${name}.json`, OUT), JSON.stringify(list, null, 1) + "\n");
  status[name] = { ok: true, count: list.length };
}

async function support(): Promise<Support[] | null> {
  const dk = env("DATA_GO_KR_KEY");
  const bk = env("BIZINFO_KEY");
  if (!dk && !bk) return null;
  const out: Support[] = [];
  if (bk) {
    console.log("기업마당…");
    out.push(...bizinfoRows(await getJson(`https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=${encodeURIComponent(bk)}&dataType=json&searchCnt=1000`)));
  }
  if (dk) {
    console.log("K-Startup…");
    const pages = await Promise.all([1, 2, 3].map((p) => getJson(`https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01?serviceKey=${encodeURIComponent(dk)}&page=${p}&perPage=500&returnType=json&cond[rcrt_prgs_yn::EQ]=Y`)));
    out.push(...kstartupRows(pages));
  }
  return keepOpen(out, today).sort((a, b) => (a.end ?? "9999").localeCompare(b.end ?? "9999"));
}

async function services(): Promise<Service[] | null> {
  const dk = env("DATA_GO_KR_KEY");
  if (!dk) return null;
  console.log("정부24 서비스…");
  // 거르기가 안 먹어서 전부(1만 개쯤) 받고 바로 줄여요 (비틀 조사와 같아요)
  const pages = await Promise.all(Array.from({ length: 12 }, (_, i) => getJson(`https://api.odcloud.kr/api/gov24/v3/serviceList?page=${i + 1}&perPage=1000&serviceKey=${encodeURIComponent(dk)}`)));
  return keepOpen(serviceRows(pages), today);
}

async function exams(): Promise<Exam[] | null> {
  const dk = env("DATA_GO_KR_KEY");
  if (!dk) return null;
  console.log("Q-Net 시험일정…");
  const year = Number(today.slice(0, 4));
  const pages = await Promise.all(
    [year, year + 1].flatMap((y) => [1, 2, 3].map(async (p) => ({ year: y, page: await getJson(`https://apis.data.go.kr/B490007/qualExamSchd/getQualExamSchdList?serviceKey=${encodeURIComponent(dk)}&numOfRows=50&pageNo=${p}&dataFormat=json&implYy=${y}&qualgbCd=T`) }))),
  );
  // 실기 발표까지 다 지난 회차는 빼요
  return examRows(pages).filter((e) => (e.practical.pass ?? e.written.pass ?? "9999") >= today);
}

await save("support", await support());
await save("services", await services());
await save("exams", await exams());

// 바뀐 게 없는 날도 status는 새로 써요(언제 마지막으로 돌았는지 보려고)
await Deno.writeTextFile(new URL("status.json", OUT), JSON.stringify({ ran: new Date().toISOString(), today, sources: status }, null, 1) + "\n");
console.log(today, JSON.stringify(status));
if (Object.values(status).every((s) => !s.ok)) Deno.exit(env("DATA_GO_KR_KEY") || env("BIZINFO_KEY") ? 1 : 0);
