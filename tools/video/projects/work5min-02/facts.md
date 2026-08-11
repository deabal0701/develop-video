# work5min-02 자료조사 — 프롬프트, 왜 질문이 절반인가

내레이션에 들어가는 주장 — 출처 — 확인 날짜. develop-lecture 규약: 출처를 못 찾은 수치는
내레이션에서 뺀다. 시의성 강한 값(현행 모델 성능·요금)은 박지 않고 구조를 설명한다.

## 검증된 것

| 주장 | 출처 | 확인 날짜 |
|---|---|---|
| **제로샷(zero-shot)** = 예시 없이 지시만 주는 것 · **퓨샷(few-shot)** = 원하는 형태의 예시를 몇 개 함께 주는 것. 퓨샷은 파인튜닝 없이 성능을 끌어올리는 기본 기법 | [Brown et al. 2020, "Language Models are Few-Shot Learners" (arXiv:2005.14165)](https://arxiv.org/pdf/2005.14165) — 1강과 같은 논문 | 2026-08-09 |
| **생각의 사슬(Chain-of-Thought, CoT)** = 중간 추론 단계를 쓰게 하면 복잡한 문제 성능이 오른다. **2022년 1월 구글 연구진(Wei et al.) 논문**에서 제시 | [Wei et al. 2022 (arXiv:2201.11903)](https://arxiv.org/abs/2201.11903) | 2026-08-09 |
| **"단계별로 생각해 보자(Let's think step by step)" 한 줄만 덧붙여도** 예시 없이 성능이 오른다(Zero-shot-CoT). 2022년 5월 Kojima et al. | [Kojima et al. 2022 (arXiv:2205.11916)](https://arxiv.org/abs/2205.11916) | 2026-08-09 |
| **실측 수치(같은 모델·같은 문제, 한 줄 차이)** — MultiArith 정답률 **17.7% → 78.7%**, GSM8K **10.4% → 40.7%**. 모델은 InstructGPT(text-davinci-002) | [Kojima et al. 2022 초록](https://arxiv.org/abs/2205.11916) — 논문 수치라 불변 | 2026-08-09 |
| **논문이 실제로 쓴 두 프롬프트** — 제로샷(17.7%)은 산술 문제 뒤에 **"답은 —"**(원문 `Therefore, the answer (arabic numerals) is`)로 **답을 바로 쓰게** 하고, Zero-shot-CoT(78.7%)는 먼저 **"단계별로 생각해 보자"**(`Let's think step by step.`)를 붙여 풀이를 쓰게 한 뒤 같은 답 유도문을 붙인다. **논문이 바꾼 변수는 '정중함·길이'가 아니라 오직 "답 직행이냐, 풀이 경유냐" 하나다** | [저자 공개 코드 kojima-takeshi188/zero_shot_cot main.py](https://github.com/kojima-takeshi188/zero_shot_cot) | 2026-08-09 |
| **파생 계산(직접 산출 — 논문 명시값 아님)** — `78.7 ÷ 17.7 = 약 4.45배` · `78.7 − 17.7 = 61.0%p`. 화면 각인은 **"4.4배"** 로 통일한다 | 위 Kojima 초록 수치에서 산출 | 2026-08-09 |
| **시스템 프롬프트 / 유저 프롬프트** — API 는 통짜 텍스트가 아니라 **역할(role)이 붙은 메시지 목록**을 보낸다. 시스템 메시지가 먼저 읽히며 역할·규칙을 정하고, 유저 메시지가 그 안에서 개별 요청을 담는다. OpenAI 는 `system` 역할, Anthropic 은 `system` 파라미터, Google 은 `systemInstruction` 으로 구현 | [Tetrate — System Prompts vs User Prompts](https://tetrate.io/learn/ai/system-prompts-vs-user-prompts), [PromptHub](https://www.prompthub.us/blog/the-difference-between-system-messages-and-user-messages-in-prompt-engineering) | 2026-08-09 |

## 1강에서 이어받는 것 (work5min-01/facts.md 검증분)

| 주장 | 출처 |
|---|---|
| LLM 은 저장된 답을 조회하지 않고 매 토큰마다 확률 분포를 계산해 그 자리에서 생성한다 | [CSET](https://cset.georgetown.edu/article/the-surprising-power-of-next-word-prediction-large-language-models-explained-part-1/) · [IBM](https://www.ibm.com/think/topics/gpt) |
| 프롬프트가 곧 "지금까지의 글" — 다음 토큰 확률은 앞선 글 전체를 조건으로 계산된다 | 위와 같음 (2강의 논리적 토대: 입력이 바뀌면 확률 지형이 바뀐다) |

## 쓰지 않기로 한 것

- **"프롬프트를 잘 쓰면 생산성 N배"류 수치** — 마케팅 자료마다 달라 출처가 서지 않는다. 뺀다.
- **현행 모델(GPT-5 등)에서의 CoT 효과 수치** — 최신 모델은 추론이 내장돼 CoT 프롬프트 효과가
  다르다는 연구도 있다([arXiv:2506.14641](https://arxiv.org/abs/2506.14641)). 그래서 실측 수치는
  **"2022년 그 논문, 그 모델 기준"이라고 반드시 시점·모델을 한정**해서 말한다.
- **프롬프트 템플릿 판매·강의 홍보성 주장** — 강좌 신뢰를 깎는다.
- **"이제 아는 척할 수 있다"류 효용 선언** — 스킬 '깊이' 절 금지 사항.
- **MultiArith 문제 개수("같은 문제 100개")** — 초록에 없고 저장소 근거도 없다. **"같은 문제"로만** 쓴다.
- **"정중하게·길게 부탁한 쪽이 졌다"는 서사** — 컨셉 검증에서 걸러진 오류. 논문의 제로샷 베이스라인은
  정중하지도 길지도 않다(위 저자 코드 행 참조). 통념("정중히 부탁하면 잘 답한다")은 **화면이 아니라
  내레이션 논평으로만** 다루고, 실측 수치를 그 서사에 붙이지 않는다.
- **60.1%p** — 61.0%p 의 계산 오류. 어디에도 쓰지 않는다.
