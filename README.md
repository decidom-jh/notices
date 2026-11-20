# 공고 (notices)

정부·공공기관의 **공고와 제도 목록**을 하루 한 번 받아 같은 모양으로 정리해 두는 곳이에요.
한권과 비틀이 같이 써요. 원본은 여기 하나만 두고, 앱은 읽어 가기만 해요(사례집 `casebook`과 같은 방식).

- 받는 일: 여기(`scripts/fetch.ts`, GitHub Actions가 매일 한국 아침 6시에 돌려요).
- 앱마다 다른 것은 앱에 둬요: 이 사람에게 어떤 공고를 붙일지 고르는 규칙, 보여 주는 모양.
- 처음 코드는 비틀(`2ndlife_web/veetle_app_v3/src/server/notices.ts`)의 받기 부분을 옮겨 왔어요(2026-11-20).

## 파일

| 곳 | 무엇 | 어디서 |
|---|---|---|
| `data/support.json` | 지원사업 공고(마감 안 지난 것). 소상공인·창업·중소기업 지원, 교육 모집 | 기업마당(`BIZINFO_KEY`), K-Startup(`DATA_GO_KR_KEY`) |
| `data/services.json` | 정부24 보조금·서비스 목록. 마감 없는 제도가 많아요 | 공공데이터포털 정부24 서비스(`DATA_GO_KR_KEY`) |
| `data/exams.json` | 국가기술자격 시험 회차(원서접수·시험·발표일) | 공공데이터포털 Q-Net(`DATA_GO_KR_KEY`) |
| `data/status.json` | 마지막으로 돈 때와 곳마다 받았는지 | |
| `scripts/parse.ts` | 원본 → 같은 모양 (꼴은 이 파일 맨 위 `Support`·`Service`·`Exam`) | |
| `scripts/test.ts` | 모양 맞추기 점검(키 없이) | |

- 받기에 실패한 날은 지난 파일을 그대로 둬요. 지원사업은 곳(기업마당·K-Startup)마다 따로 지켜서, 한 곳만 실패하면 그곳만 지난 목록을 써요(`status.json`에 `support:bizinfo` 줄이 생겨요). 기업마당은 해외 서버(GitHub)에서 느릴 때가 있어 60초 기다리고 한 번 더 해요. 얼마나 오래된 목록인지는 `status.json`의 `ran`으로 봐요.
- 날짜는 모두 `YYYY-MM-DD`, 모르면 `null`. 지역은 시·도 짧은 이름(`서울`, `경기` …), 열 곳 넘게 걸리면 `["전국"]`.

## 키 넣기 (한 번만)

GitHub 저장소 Settings → Secrets and variables → Actions에 둘을 넣어요. 값은 사람이 직접 넣어요.

- `DATA_GO_KR_KEY`: 공공데이터포털(data.go.kr) 일반 인증키. K-Startup 사업공고, 정부24 서비스 목록, Q-Net 시험일정을 활용 신청해 둬야 해요.
- `BIZINFO_KEY`: 기업마당(bizinfo.go.kr) API 인증키.

넣은 뒤 Actions 탭에서 「공고 받기」를 한 번 손으로 돌려 봐요(`workflow_dispatch`).

## 고치는 법

1. `scripts/parse.ts`를 고치고 `scripts/test.ts`에 예시를 더해요.
2. 점검: `deno run scripts/test.ts` (`npx -y deno run scripts/test.ts`도 돼요)
3. 키가 있으면 손으로 받기: `DATA_GO_KR_KEY=… BIZINFO_KEY=… deno run --allow-net --allow-env --allow-read --allow-write scripts/fetch.ts`
4. 커밋하고 올려요. 고치기 전에 `git pull`(매일 봇이 `data/`를 올려요).

## 다음에 더할 것

- 나라장터 입찰 공고(공공데이터포털 조달청, 하루치만 조회돼요). 업종으로 거를 방법을 정한 뒤에.
- 고용24 훈련과정(내일배움카드 과정). 이용 조건(공공누리 유형)을 먼저 봐요. 고용24 채용은 「상업적 이용 금지」라 안 받아요.
- 곳마다 이용 조건을 다시 확인해 두기(받은 공고를 저장해 다시 보여 줘도 되는지, 출처 표시).
