# insa-IT 홍보영상 — 내레이션에 쓴 수치의 출처

영상 id `insa-it-promo`. 아래 표에 없는 숫자는 대본에 넣지 않는다.
원본 저장소: `/Users/user/Develop/76.h5-saas/h5-saas/h5-saas-docs` (이 저장소가 아니다 — 여기는 영상 툴체인이다).
확인일 2026-08-08. 확인 방법: 해당 저장소에서 `grep -rn '<수치>' --include='*.md' .`

## AS-IS (현행 H5)

| 수치 | 값 | 출처 파일 |
|---|---|---|
| JSP 화면 수 | 3,614개 | `00-isp/99_development-plan/bak/DEVELOPMENT-PLAN-v1.0.md:238` · `00-isp/04_target-model-digest/README.md:32` |
| JSP 총 라인 | 약 156만 라인 | `00-isp/99_development-plan/bak/DEVELOPMENT-PLAN-v1.0.md:176,238` |
| 화면 1건 추가·수정 | 평균 2~3일 | `00-isp/99_development-plan/bak/DEVELOPMENT-PLAN-v1.0.md:176` |
| DB 테이블 | 1,629개 (사용 중 1,021) | `00-isp/99_development-plan/bak/DEVELOPMENT-PLAN-v1.0.md:233` |
| 빈 테이블 | 608개 | `00-isp/04_target-model-digest/README.md:32` |
| HTTP 엔드포인트 | 1개 (`/serviceBroker.h5`) | `10-myjob/02-study/asis-deep-dive/README.md:13` · `01-asis/00_overall-summary.md` §4 |
| 서비스 정의 | 6,206건 | `00-isp/.../DEVELOPMENT-PLAN-v1.0.md:261,273,300` · `10-myjob/02-study/asis-deep-dive/00_environment.md:317` |
| 상용 그리드 | IBSheet (대체 결정) | `05-meetings/weekly/weekly_2026-05-22.md:21` |

## TO-BE (insa-IT)

| 수치 | 값 | 출처 파일 |
|---|---|---|
| 스택 | Spring Boot 4 + MyBatis + 전면 REST + JWT / Vue 3 | `README.md:6` · `02-tobe/01-architecture/01_stack.md` |
| 그리드 | TOAST UI Grid (`tui-grid`, OSS) | `README.md:6` · `05-meetings/weekly/weekly_2026-06-12.md:17` |
| 멀티테넌시 | JWT `tenantCd` → MyBatis Interceptor 가 `WHERE TENANT_CD=?` 자동 부착 | `02-tobe/01-architecture/04_multitenancy.md` |
| 확정 1depth | 인사기본 · 보상관리 · 환경설정 3종 | `02-tobe/10.기획서/2.미래모델/5.화면 기획서/README.md` §7 |

## 목표치 (실적 아님 — 반드시 "목표"로 표기)

| 지표 | 목표 | 출처 |
|---|---|---|
| 신규 고객 온보딩 리드타임 | 4주 → 3일 | `00-isp/02_business-alignment/01_strategy-alignment.md` §2 |
| 인프라 세트 수 | N → 1 | 〃 |
| 화면 개발·유지보수 | 2~3일 → 수 시간 | 개발계획서 v0.8 §8.1 |
| 모바일·반응형 대응 | 0% → 100% | 〃 |

## 화면에 보이는 것 (녹화본에서 직접 셀 수 있는 값만)

| 수치 | 값 | 확인 방법 |
|---|---|---|
| 구성원 리스트 | 총 23건 | 데모 사이트 `/phm/member-all` 화면에 "총 23건" 표기 |
| 조직도 루트 인원 | 총 23명 | 데모 사이트 `/orm/org-chart` |
| 연차 잔여 | 14일 | 데모 사이트 홈 위젯 |
| 제품 태그라인 | "HR을 가장 똑똑하게 / 인사이트를 주는 업무공간, 인사잇" | 데모 사이트 로그인 화면 실물 |

## 쓰지 않기로 한 것

개발 기간 · 투자금액 · ROI · 절감률 · 고객사 수 · 매출 · 경쟁사 비교 · 성능 수치(TPS·응답시간).
전부 원본 문서에서 TBD 이거나 존재하지 않는다 (`00-isp/01_executive-summary/01_executive-summary_v1.md:18` 등).

보상관리(급여) 화면은 **퍼블리싱 완료 / 실연동은 Phase 2** 이므로 "완성"이라 말하지 않는다
(`.claude/skills/develop-loop/pay-publish-progress.md:3` · `03-develop/00_overview.md:46`).

데모 사이트(`http://161.33.226.214:38080/`)는 mock 데이터로 동작하며 백엔드가 연결되어 있지 않다.
따라서 화면은 "실제 구현된 UI"의 증거이지 "실 DB 연동"의 증거가 아니다 — 내레이션도 그 선을 지킨다.
