// 모양 맞추기 점검: deno run scripts/test.ts  (키 없이, 작은 예시로)
import { bizinfoRows, day, examRows, keepOpen, kstartupRows, openableUrl, serviceRows } from "./parse.ts";

let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? "맞음" : "틀림"} ${name}${ok ? "" : `\n  받음 ${JSON.stringify(got)}\n  바람 ${JSON.stringify(want)}`}`);
};

eq("날짜 세 꼴", [day("20261120"), day("2026-11-20"), day("2026.11.20"), day("")], ["2026-11-20", "2026-11-20", "2026-11-20", null]);
eq("정부24 주소 바꾸기", openableUrl("https://plus.gov.kr/portal/x?svcId=ABC123&y=1"), "https://www.gov.kr/portal/rcvfvrSvc/dtlEx/ABC123");

const biz = bizinfoRows({
  jsonArray: [
    { pblancId: "PBLN_1", pblancNm: "2027년 희망리턴패키지 <b>점포철거</b> 지원", bsnsSumryCn: "폐업 소상공인 철거비", pblancUrl: "https://www.bizinfo.go.kr/a?pblancId=PBLN_1", reqstBeginEndDe: "2027-01-05 ~ 2027-03-31", hashtags: "서울,경기,소상공인", trgetNm: "소상공인", pldirSportRealmLclasCodeNm: "경영", jrsdInsttNm: "중소벤처기업부" },
    { pblancId: "PBLN_2", pblancNm: "전국 공고", pblancUrl: "https://x", reqstBeginEndDe: "상시", hashtags: "서울,부산,대구,인천,광주,대전,울산,세종,경기,강원", trgetNm: "중소기업" },
    { pblancNm: "주소 없음" },
  ],
});
eq("기업마당 개수(주소 없는 줄 빼기)", biz.length, 2);
eq("기업마당 첫 줄", [biz[0].id, biz[0].title, biz[0].regions, biz[0].start, biz[0].end, biz[0].org], ["bizinfo:PBLN_1", "2027년 희망리턴패키지 점포철거 지원", ["서울", "경기"], "2027-01-05", "2027-03-31", "중소벤처기업부"]);
eq("기업마당 열 곳 넘으면 전국, 상시는 날짜 없음", [biz[1].regions, biz[1].start, biz[1].end], [["전국"], null, null]);

const ks = kstartupRows([{ data: [{ pbanc_sn: 17000, biz_pbanc_nm: "중장년 기술창업센터 입주", pbanc_rcpt_bgng_dt: "20261101", pbanc_rcpt_end_dt: "20261130", supt_regin: "경기", aply_trgt: "일반인", biz_enyy: "예비창업자", supt_biz_clsfc: "시설ㆍ공간ㆍ보육", pbanc_ntrp_nm: "창업진흥원" }, { biz_pbanc_nm: "번호 없음" }] }, null]);
eq("K-Startup", ks.map((k) => [k.id, k.regions, k.start, k.end, k.target]), [["kstartup:17000", ["경기"], "2026-11-01", "2026-11-30", "일반인 · 업력 예비창업자"]]);

const sv = serviceRows([{ data: [{ "서비스ID": "SVC1", "서비스명": "중장년 경력지원제", "서비스목적요약": "경력 전환", "지원대상": "50~65세 미취업", "서비스분야": "고용·창업", "사용자구분": "개인", "소관기관명": "고용노동부", "소관기관유형": "중앙행정기관", "신청기한": "상시신청", "상세조회URL": "https://plus.gov.kr/portal/x?svcId=SVC1" }, { "서비스ID": "SVC2", "서비스명": "문화 행사", "서비스분야": "문화·환경", "상세조회URL": "https://x" }] }]);
eq("정부24 분야 거르기와 주소", sv.map((s) => [s.id, s.until, s.url]), [["gov24:SVC1", "상시신청", "https://www.gov.kr/portal/rcvfvrSvc/dtlEx/SVC1"]]);

const ex = examRows([{ year: 2027, page: { body: { items: { item: [{ description: "국가기술자격 정기 기사 1회", implYy: "2027", docRegStartDt: "20270113", docRegEndDt: "20270116", docExamStartDt: "20270207", docPassDt: "20270312", pracRegStartDt: "20270324", pracRegEndDt: "20270327", pracExamStartDt: "20270419", pracPassDt: "20270606" }] } } } }]);
eq("Q-Net", [ex[0].name, ex[0].written.applyStart, ex[0].practical.pass], ["국가기술자격 정기 기사 1회", "2027-01-13", "2027-06-06"]);

eq("마감 지난 것·같은 id 빼기", keepOpen([{ id: "a", end: "2026-11-19" }, { id: "b", end: "2026-11-20" }, { id: "b", end: "2026-12-01" }, { id: "c", end: null }], "2026-11-20").map((x) => x.id), ["b", "c"]);

console.log(bad ? `틀림 ${bad}개` : "모두 맞음");
if (bad) Deno.exit(1);
