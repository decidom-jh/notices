// 공고 모양 맞추기 (2026-11-20). 받은 원본 → 같은 모양. 바깥에 묻지 않는 순수 함수만 둬요(scripts/test.ts로 확인).
// 처음 코드는 비틀(2ndlife_web/veetle_app_v3/src/server/notices.ts)의 받기 부분을 옮겨 왔어요. 누구에게 붙일지 고르는 규칙은 앱마다 따로 둬요.

/** 지원사업 공고 (기업마당 · K-Startup) */
export type Support = {
  id: string;
  source: "bizinfo" | "kstartup";
  title: string;
  /** 주관·소관 기관 */
  org: string;
  /** 분야 (예: 금융, 창업, 경영) */
  realm: string;
  /** 지원 대상 글 그대로 */
  target: string;
  summary: string;
  /** 시·도 짧은 이름. 비면 모름, ["전국"]이면 전국 */
  regions: string[];
  /** 접수 시작·마감 (YYYY-MM-DD, 모르면 null) */
  start: string | null;
  end: string | null;
  url: string;
};

/** 정부24 보조금·서비스 목록 (마감이 없는 제도가 많아요) */
export type Service = {
  id: string;
  name: string;
  summary: string;
  target: string;
  /** 서비스 분야 (고용·창업, 생활안정 …) */
  field: string;
  /** 개인 · 소상공인 · 법인 … */
  who: string;
  org: string;
  orgType: string;
  /** 신청 기한 글 그대로 (상시신청 등) */
  until: string;
  url: string;
};

/** 국가기술자격 시험 회차 (Q-Net) */
export type Exam = {
  year: number;
  /** 회차 이름 (예: 2027년 정기 기사 1회) */
  name: string;
  written: { applyStart: string | null; applyEnd: string | null; exam: string | null; pass: string | null };
  practical: { applyStart: string | null; applyEnd: string | null; exam: string | null; pass: string | null };
};

export const PROVINCES = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

export const strip = (s: unknown): string =>
  String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** 20261120 · 2026-11-20 · 2026.11.20 → 2026-11-20 */
export function day(raw: unknown): string | null {
  const m = String(raw ?? "").match(/(\d{4})[-.]?(\d{2})[-.]?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** 보조금24 상세 주소: plus.gov.kr 주소는 폰에서 안 열려서 정부24 상세로 바꿔요 (비틀 lib/gov-url.ts와 같아요) */
export function openableUrl(url: string): string {
  if (!/^https?:\/\/plus\.gov\.kr\//.test(url)) return url;
  const id = url.match(/[?&]svcId=([A-Za-z0-9]+)/)?.[1];
  return id ? `https://www.gov.kr/portal/rcvfvrSvc/dtlEx/${id}` : url;
}

/** 시·도 이름 고르기. 열 곳 넘게 걸리면 사실상 전국이에요 */
function regionsOf(words: string[]): string[] {
  const out = new Set<string>();
  for (const w of words) {
    const t = w.trim();
    if (!t) continue;
    if (t === "전국") out.add("전국");
    else if (t === "전남광주") (out.add("전남"), out.add("광주"));
    else {
      const p = PROVINCES.find((n) => t.startsWith(n) || (n === "충북" && /^충청북/.test(t)) || (n === "충남" && /^충청남/.test(t)) || (n === "전북" && /^전라북|^전북/.test(t)) || (n === "전남" && /^전라남/.test(t)) || (n === "경북" && /^경상북/.test(t)) || (n === "경남" && /^경상남/.test(t)));
      if (p) out.add(p);
    }
  }
  if (out.size >= 10) return ["전국"];
  return [...out];
}

type BizRow = { pblancId?: string; pblancNm?: string; bsnsSumryCn?: string; pblancUrl?: string; reqstBeginEndDe?: string; hashtags?: string; trgetNm?: string; pldirSportRealmLclasCodeNm?: string; jrsdInsttNm?: string; excInsttNm?: string };

/** 기업마당 지원사업 (bizinfoApi.do, dataType=json) */
export function bizinfoRows(data: unknown): Support[] {
  const rows = ((data as { jsonArray?: BizRow[] } | null)?.jsonArray ?? []) as BizRow[];
  return rows
    .map((r): Support => {
      const range = String(r.reqstBeginEndDe ?? "");
      const [a, b] = range.split("~");
      return {
        id: `bizinfo:${r.pblancId || r.pblancUrl || strip(r.pblancNm)}`,
        source: "bizinfo",
        title: strip(r.pblancNm),
        org: strip(r.jrsdInsttNm || r.excInsttNm || "기업마당").slice(0, 40),
        realm: strip(r.pldirSportRealmLclasCodeNm),
        target: strip(r.trgetNm).slice(0, 200),
        summary: strip(r.bsnsSumryCn).slice(0, 600),
        regions: regionsOf(String(r.hashtags ?? "").split(",")),
        start: day(a),
        end: day(b),
        url: r.pblancUrl ?? "",
      };
    })
    .filter((n) => n.title && n.url);
}

type KsRow = { pbanc_sn?: number | string; biz_pbanc_nm?: string; pbanc_ctnt?: string; pbanc_rcpt_bgng_dt?: string; pbanc_rcpt_end_dt?: string; supt_regin?: string; aply_trgt?: string; aply_trgt_ctnt?: string; biz_enyy?: string; supt_biz_clsfc?: string; pbanc_ntrp_nm?: string; detl_pg_url?: string };

/** K-Startup 사업공고 (kisedKstartupService01, returnType=json) */
export function kstartupRows(pages: unknown[]): Support[] {
  const rows = pages.flatMap((p) => ((p as { data?: KsRow[] } | null)?.data ?? [])) as KsRow[];
  return rows
    .map((r): Support => ({
      id: `kstartup:${r.pbanc_sn}`,
      source: "kstartup",
      title: strip(r.biz_pbanc_nm),
      org: strip(r.pbanc_ntrp_nm || "K-Startup").slice(0, 40),
      realm: strip(r.supt_biz_clsfc),
      target: strip([r.aply_trgt, r.biz_enyy && `업력 ${r.biz_enyy}`, r.aply_trgt_ctnt].filter(Boolean).join(" · ")).slice(0, 200),
      summary: strip(r.pbanc_ctnt).slice(0, 600),
      regions: regionsOf(String(r.supt_regin ?? "").split(/[,\s]+/)),
      start: day(r.pbanc_rcpt_bgng_dt),
      end: day(r.pbanc_rcpt_end_dt),
      url: r.detl_pg_url || `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=${r.pbanc_sn}`,
    }))
    .filter((n) => n.title && !n.id.endsWith(":undefined"));
}

/** 정부24 서비스 목록 (odcloud gov24 v3 serviceList). 중장년·개인이 볼 만한 분야만 남겨요 */
export const SERVICE_FIELDS = /고용·창업|주거·자립|생활안정|보육·교육|보건·의료|행정·안전|농림축산어업/;
export function serviceRows(pages: unknown[]): Service[] {
  const rows = pages.flatMap((p) => ((p as { data?: Record<string, string | null>[] } | null)?.data ?? []));
  return rows
    .filter((r) => SERVICE_FIELDS.test(r["서비스분야"] ?? ""))
    .map((r): Service => ({
      id: `gov24:${r["서비스ID"] ?? strip(r["서비스명"])}`,
      name: strip(r["서비스명"]),
      summary: strip(r["서비스목적요약"]).slice(0, 300),
      target: strip(r["지원대상"]).slice(0, 300),
      field: strip(r["서비스분야"]),
      who: strip(r["사용자구분"]),
      org: strip(r["소관기관명"]),
      orgType: strip(r["소관기관유형"]),
      until: strip(r["신청기한"]).slice(0, 100),
      url: openableUrl(String(r["상세조회URL"] ?? "")),
    }))
    .filter((s) => s.name && s.url);
}

type ExamRow = { description?: string; implYy?: string; implSeq?: string; docRegStartDt?: string; docRegEndDt?: string; docExamStartDt?: string; docPassDt?: string; pracRegStartDt?: string; pracRegEndDt?: string; pracExamStartDt?: string; pracPassDt?: string };

/** Q-Net 국가기술자격 시험일정 (getQualExamSchdList, dataFormat=json). 페이지마다 받은 해를 같이 넘겨요 */
export function examRows(pages: { year: number; page: unknown }[]): Exam[] {
  return pages.flatMap(({ year, page }) => {
    const items = (page as { body?: { items?: ExamRow[] | { item?: ExamRow[] } } } | null)?.body?.items;
    const rows = Array.isArray(items) ? items : (items?.item ?? []);
    return rows.map((r): Exam => ({
      year: Number(r.implYy) || year,
      name: strip(r.description) || `${year}년 ${r.implSeq ?? ""}회`,
      written: { applyStart: day(r.docRegStartDt), applyEnd: day(r.docRegEndDt), exam: day(r.docExamStartDt), pass: day(r.docPassDt) },
      practical: { applyStart: day(r.pracRegStartDt), applyEnd: day(r.pracRegEndDt), exam: day(r.pracExamStartDt), pass: day(r.pracPassDt) },
    }));
  });
}

/** 마감이 오늘보다 앞이면 빼요(마감 모름은 둬요). 같은 id는 하나만 */
export function keepOpen<T extends { id: string; end?: string | null }>(list: T[], today: string): T[] {
  const seen = new Set<string>();
  return list.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return !n.end || n.end >= today;
  });
}
