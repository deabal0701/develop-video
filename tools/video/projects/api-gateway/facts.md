# API Gateway — 사실 확인

확인 날짜: 2026-08-11. 이 회차는 **수치·연도·제도를 쓰지 않는다**(시의성 있는 값은 업로드
뒤에 거짓이 되므로 — develop-lecture 자료조사 규율). 남은 것은 전부 구조 설명이고,
그 구조의 근거를 아래에 남긴다.

| 주장 (내레이션에 나가는 형태) | 출처 | 확인 |
|---|---|---|
| API 게이트웨이는 여러 서비스 **앞에 두는 단일 진입점**이다 | microservices.io — "Implement an API gateway that is the single entry point for all clients." | 2026-08-11 |
| 들어온 요청을 **알맞은 서비스로 보낸다(라우팅)** | 같은 문서 — "Some requests are simply proxied/routed to the appropriate service." | 2026-08-11 |
| 클라이언트가 **내부 서비스 위치 변화를 몰라도 된다** | 같은 문서 — 문제 정의 "Dynamic Service Infrastructure: Service locations change dynamically, and clients shouldn't need to track these changes." / 책임 "Service Abstraction: Insulating clients from internal service architecture changes" | 2026-08-11 |
| 게이트웨이가 **인증·인가를 맡는다** | 같은 문서 — 책임 "Security: Authenticating clients and verifying authorization" | 2026-08-11 |
| 게이트웨이가 **요청 횟수를 제한한다(레이트 리미팅)** | AWS API Gateway 개발자 안내서 — 계정·API/스테이지·클라이언트(사용량 계획) 세 층위의 throttling 설정을 제공하고, 한도를 넘으면 `429 Too Many Requests` 를 돌려준다 | 2026-08-11 |

출처 URL

- https://microservices.io/patterns/apigateway.html
- https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
- https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html

## 대본에서 일부러 뺀 것

| 뺀 것 | 왜 |
|---|---|
| BFF(Backend For Frontend), 서비스 메시, 컴포지션(fan-out 응답 합치기) | 3분에 개념 하나를 세우는 것이 이 회차의 일이다. 용어를 늘리면 회차가 목록이 된다(용어 3개 상한) |
| 특정 제품 이름(Kong·Nginx·AWS API Gateway 등) | 제품 비교는 이 강의의 과녁(회의에서 흐름을 놓치지 않는 수준)을 넘고, 제품 라인업은 바뀐다 |
| `429` 같은 상태 코드 숫자 | 회차당 수치 한 쌍 상한. 이 회차의 자리는 "서버 여섯 곳" 쪽이 가져갔다 |
| 처리량·지연 수치 | 환경마다 달라 근거로 세울 수 없다 |
