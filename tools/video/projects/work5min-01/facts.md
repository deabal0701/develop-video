# work5min-01 자료조사 — LLM이란 무엇인가

내레이션에 들어가는 주장 — 출처 — 확인 날짜. develop-lecture 규약: 출처를 못 찾은 수치는
내레이션에서 뺀다. 시의성 강한 값(현행 모델의 파라미터·사용자 수)은 박지 않고 구조를 설명한다.

| 주장 | 출처 | 확인 날짜 |
|---|---|---|
| LLM/GPT 의 핵심 학습 목표는 **다음 토큰(단어 조각) 예측** — 앞선 글을 보고 다음에 올 조각의 확률 분포를 맞히는 것 | [CSET — The Surprising Power of Next Word Prediction](https://cset.georgetown.edu/article/the-surprising-power-of-next-word-prediction-large-language-models-explained-part-1/), [IBM — What is GPT](https://www.ibm.com/think/topics/gpt) | 2026-08-09 |
| GPT = **Generative Pre-trained Transformer** (생성형 · 사전학습된 · 트랜스포머) | [IBM — What is GPT](https://www.ibm.com/think/topics/gpt) | 2026-08-09 |
| GPT-3 는 **파라미터 1,750억 개**, 학습에 **약 3,000억 토큰** 사용 | [Brown et al. 2020, "Language Models are Few-Shot Learners" (arXiv:2005.14165)](https://arxiv.org/pdf/2005.14165) — 논문 수치라 불변 | 2026-08-09 |
| GPT-3 학습 데이터 출처: Common Crawl(웹), 책, 위키백과 등 | 같은 논문 | 2026-08-09 |
| 트랜스포머 구조는 **2017년 구글 연구진의 논문 "Attention Is All You Need"** 에서 나왔고, 이후 GPT·Claude·Gemini 등 현대 LLM 의 공통 기반이 됐다 | [Wikipedia — Attention Is All You Need](https://en.wikipedia.org/wiki/Attention_Is_All_You_Need) | 2026-08-09 |
| LLM 은 **저장된 답변을 데이터베이스에서 조회하는 것이 아니라**, 매 토큰(단어 조각)마다 어휘 전체에 대한 확률 분포를 계산해 **답을 그 자리에서 생성**한다 (단, 학습 데이터를 축자 암기해 그대로 내는 verbatim memorization 현상이 있으므로 "한 줄도 저장돼 있지 않다"는 절대 단정은 쓰지 않는다 — "미리 써둔 답을 찾아오는 방식이 아니다" 프레임까지만) | [CSET — Next Word Prediction](https://cset.georgetown.edu/article/the-surprising-power-of-next-word-prediction-large-language-models-explained-part-1/), [IBM — What is GPT](https://www.ibm.com/think/topics/gpt) | 2026-08-09 |

## 쓰지 않기로 한 것

- **현행 모델(GPT-4 이후)의 파라미터 수** — 공식 미공개라 출처가 없다. "최신 모델은 공개조차 안 한다" 정도의 뭉뚱그림만 허용.
- **챗GPT 사용자 수** — 시의성이 강해 업로드 뒤 거짓이 된다. 뺀다.
- **"사람이 다 읽으면 N천 년" 류 환산** — 계산 근거가 출처마다 달라 뺀다. 3,000억 토큰이라는 원 수치만 쓴다.
