# Team_WICKED Design System

Wicked Shop(및 Team_WICKED 제품 전반)의 디자인 규칙.
**살아있는 데모: 개발 서버에서 `/design` 접속** — 토큰과 컴포넌트를 라이트/다크로 직접 볼 수 있다.

- 토큰 정의: [app/globals.css](../app/globals.css) (`:root` = 라이트, `.dark` = 다크)
- UI 컴포넌트: [components/ui/](../components/ui/)
- 기반: **saas 랜딩 템플릿** (레포의 `saas/` 폴더) — 사이트 프레임, 플로팅 헤더, 화살표 CTA, 모션 커브까지 원본에서 이식. Tailwind CSS v4 `@theme` + `motion` 라이브러리.

---

## 1. Brand

| 항목 | 값 |
|---|---|
| 이름 표기 | **Team_WICKED** (언더스코어 포함) / 상점은 **Wicked Shop** |
| 메인 컬러 | 라임 액센트 `#a8d946` — CTA, 하이라이트, 푸터 블록 |
| 보조 컬러 | 뉴트럴 그레이 스케일 (아래 Colors) |
| 브랜드 톤 | 개발자 대상. 직설적이고 기술적으로 정확하게. 과장 광고 문구 금지 |

**워드마크** (전 페이지 통일 — Navbar/Footer/로그인/관리자 동일):
- `wicked` = `text-foreground` · `shop` = `text-success` · 마침표 `.` = `text-accent`
- 라임 배경(푸터 액센트 블록) 위에서는 전체 `text-neutral-900`

**시그니처 요소** — 이 세 가지가 WICKED 룩의 정체성이다:
1. **사이트 프레임**: 뷰포트를 감싸는 10px `--frame` 테두리 + 둥근 코너 컷아웃 ([SiteFrame.jsx](../components/SiteFrame.jsx), 850px 이하 숨김)
2. **플로팅 pill 헤더**: 상단 중앙에 떠 있는 `rounded-b-4xl` 헤더 + 양옆 코너 SVG
3. **화살표 CTA**: 검정 pill + 라임 탭 + hover 시 45° 회전하는 화살표

**액센트 사용 규칙**: 라임(`--accent`)은 "여기를 봐라" 신호. 한 화면에 액센트 배경 요소는 **최대 1~2개** (화살표 CTA의 라임 탭, 카트 뱃지 정도). 예외: 푸터 액센트 블록은 전면 라임.

## 2. Typography

| 용도 | 클래스 | 예 |
|---|---|---|
| 히어로 헤드라인 | `text-7xl max-[850px]:text-4xl font-medium tracking-tight leading-[1.1]` | 랜딩 히어로 |
| 히어로 강조 단어 | `font-serif italic text-accent` | 헤드라인 마지막 단어 하나만 |
| 페이지 제목 (h1) | `text-3xl font-bold` | 상품 상세 제목 |
| 섹션 제목 (h2) | `text-xl font-semibold` (랜딩 섹션은 `text-3xl font-semibold`) | "FAQ" |
| 카드 제목 (h3) | `text-base font-semibold` | 상품 카드 이름 |
| 본문 | `text-sm` | 기본값 |
| 보조 텍스트 | `text-sm text-muted-foreground` | 설명, 날짜 |
| 캡션/메타 | `text-xs text-muted-foreground` | 뱃지 옆 부가정보 |
| 코드/키 | `font-mono` | 라이센스 키, 명령어 |

- 폰트: **Noto Sans KR** (400/500/600). 세리프는 히어로 강조 단어 전용.
- 색은 반드시 토큰으로 (`text-foreground` / `text-muted-foreground`). 하드코딩 금지 — 다크모드가 깨진다.

## 3. Colors — 디자인 토큰

모든 색은 CSS 변수. Tailwind에서 `bg-accent`, `text-danger`처럼 토큰 이름 그대로 클래스가 된다.

| 토큰 | Light | Dark | 용도 |
|---|---|---|---|
| `--background` | `#f5f5f5` | `#141414` | 페이지 배경 |
| `--frame` | `#ffffff` | `#000000` | 사이트 프레임, 헤더, 카드, 입력창 |
| `--foreground` | `#0a0a0a` | `#fafafa` | 본문 텍스트, primary 버튼 배경 |
| `--muted` | `#ececec` | `#171717` | 약한 배경 (스켈레톤, hover, 검색창) |
| `--muted-foreground` | `#737373` | `#a3a3a3` | 보조 텍스트 |
| `--border` | `#e5e5e5` | `#262626` | 모든 테두리 |
| `--accent` | `#a8d946` | `#a8d946` | 브랜드 라임 (양 모드 동일) |
| `--accent-soft` | `#e8f5c8` | `#2a3a1a` | 액센트 연한 배경, 히어로 그라데이션 |
| `--accent-foreground` | `#171717` | `#171717` | 액센트 배경 위 텍스트 (라임 위 흰 글씨 금지) |
| `--danger` / `--danger-soft` | `#dc2626` / `#fee2e2` | `#f87171` / `#450a0a` | 오류, 삭제, 회수 |
| `--success` / `--success-soft` | `#16a34a` / `#dcfce7` | `#4ade80` / `#052e16` | 성공, 결제완료 |
| `--warning` / `--warning-soft` | `#d97706` / `#fef3c7` | `#fbbf24` / `#451a03` | 주의, 대기, 별점 |
| `--ring` | `#0066ff` | `#3b82f6` | 포커스 아웃라인 전용 |

**규칙**
- 새 색이 필요하면 토큰을 라이트+다크 쌍으로 추가. hex 하드코딩 금지.
- 상태색(danger/success/warning)은 의미로만.
- **의도적으로 고정 색을 쓰는 곳** (다크모드에서도 안 변함): 히어로 콘솔 목업(`bg-slate-950`, 항상 어두운 터미널), 푸터 라임 블록(`text-neutral-900`), 브랜드 그라데이션 배너, 차트 색상.

### 다크모드

- `next-themes` class 전략 (`.dark`가 `<html>`에). **기본값 system** — OS 테마를 따라가고, 토글로 바꾸면 저장됨. 마이그레이션 완료 상태이므로 전 페이지(상점·주문·관리자·스토어) 대응.
- 전환 UI는 **AnimatedThemeToggler** ([components/ui/AnimatedThemeToggler.jsx](../components/ui/AnimatedThemeToggler.jsx)) — 클릭 지점에서 원형으로 퍼지는 View Transitions 애니메이션(700ms). 모든 네비바에 들어 있다. 정적인 토글이 필요한 곳(설정 페이지 등)엔 `ThemeToggle` 사용 가능.
- 다크모드 대응 = 토큰만 쓰면 끝. `dark:` variant를 일일이 붙이지 않는다.

## 4. Components

`components/ui/`에 있고 `/design`에서 실물 확인.

### 4.1 Button

| variant | 생김새 | 언제 |
|---|---|---|
| `primary` | 검정(다크에선 흰) 배경 | 화면의 **주 액션 1개** |
| `secondary` | 테두리 + frame 배경 | primary 옆의 나머지 |
| `accent` | 라임 배경 | 폼 제출·구매 등 강조 액션. 한 화면 1개 |
| `ghost` | 배경 없음, hover 시 옅게 | 툴바, 인라인 저강조 |
| `danger` | 빨간 배경 | 삭제·회수. **반드시 확인 모달과 함께** |

- 크기: `sm`/`md`(기본)/`lg`/`icon`(aria-label 필수). 모서리 `rounded-xl`, `font-semibold`.

### 4.2 화살표 CTA (saas 시그니처)

마케팅 CTA(히어로 "둘러보기", 헤더 로그인)는 Button 대신 이 패턴:

```jsx
<Link href="/shop" className="group relative inline-flex items-center">
  <span className="absolute inset-y-0 right-0 w-[calc(100%-2rem)] rounded-xl bg-accent" />
  <span className="relative z-10 rounded-xl bg-foreground px-6 py-3 font-medium text-background">라벨</span>
  <span className="relative -left-px z-10 flex h-11 w-11 items-center justify-center rounded-xl text-accent-foreground">
    <ArrowDownRight className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-45" />
  </span>
</Link>
```

구조: 라임 배경이 뒤에 깔리고, 검정 pill이 왼쪽을 덮고, 오른쪽에 화살표 탭. hover 시 화살표가 `-rotate-45`로 우상향. Navbar의 `ArrowCta` 컴포넌트 참고.

### 4.3 플로팅 헤더

- `fixed top-2.5 left-1/2 -translate-x-1/2 max-w-6xl bg-frame rounded-b-4xl shadow-2xl/20` + 양옆 코너 SVG
- 모바일(≤850px): `top-0` 풀폭, `rounded-b-3xl`, 햄버거(두 줄 → X 모핑)
- 네비 링크는 pill: `rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-foreground/5`
- 고정 헤더라서 `(public)/layout.jsx`의 `<main>`에 `pt-28 max-[850px]:pt-20` — 새 공개 페이지는 이 레이아웃 안에 있으면 신경 쓸 것 없음
- z-index 위계: **사이트 프레임 60 > 모달 50 > 헤더 40**

### 4.4 Card

- `rounded-2xl border border-border bg-frame p-5 sm:p-6 shadow-sm`
- 페이지 배경 `bg-background` 위에 서피스는 전부 `bg-frame` — 이 2단 대비가 뼈대.
- **모서리 위계**: 푸터 블록 `rounded-t-[3rem]` > CTA 카드 `rounded-3xl` > 헤더 `rounded-b-4xl` > 카드 `rounded-2xl` > 버튼·입력 `rounded-xl` > 뱃지·pill `rounded-full`
- 강조 카드는 `border-accent bg-accent-soft` — 페이지당 1개.

### 4.5 Input / Textarea / Select (`Field.jsx`)

- `rounded-xl border-border bg-frame px-4 py-2.5 text-sm`, `Label` 필수
- 오류: `invalid` prop + `<FieldError>`. placeholder는 예시 값.
- 검색창은 pill 형태: `rounded-full bg-muted px-4 py-3`

### 4.6 Modal / Switch / Slider / Badge / Alert / Skeleton / Tabs

- **Modal**: 오버레이 `bg-black/50 backdrop-blur-sm`, 본체는 카드 스타일. Escape/배경/X로 항상 닫힘. 한 번에 1개.
- **Switch**: 즉시 적용 설정에. 켜짐 = 라임.
- **Slider**: 네이티브 range + `accent-color: var(--accent)`. 현재 값 항상 표시.
- **Badge**: `rounded-full px-3 py-1 text-xs font-semibold`. 상태는 soft 배경 조합.
- **Alert**: 인라인 상태 공지. 토스트(react-hot-toast)는 액션 결과용.
- **Skeleton**: `animate-pulse bg-muted`, 콘텐츠 모양대로.
- **Tabs**: pill, 활성 = `bg-foreground text-background`.

### 4.7 랜딩 섹션 패턴

- **Hero** ([Hero.jsx](../components/Hero.jsx)): 패럴랙스 라임 그라데이션 배경(`inset-2.5 rounded-b-4xl`) + 뱃지 pill + blur-in 헤드라인(마지막 단어 세리프 이탤릭 라임) + 화살표 CTA + 아래로 페이드되는 마스크 프리뷰 패널(`mask-[linear-gradient(to_bottom,black_55%,transparent_100%)]`)
- **FAQ** ([FAQ.jsx](../components/FAQ.jsx)): `rounded-2xl bg-frame` 카드 아코디언, 셰브론 180° 회전, grid-rows CSS 전환
- **Footer** ([Footer.jsx](../components/Footer.jsx)): 라임 그라데이션 플로팅 CTA 카드(뉴스레터 폼 내장)가 `rounded-t-[3rem] bg-accent` 블록 위에 겹쳐 뜨는 구조. 라임 블록 위 텍스트는 `text-neutral-900` 고정.

## 5. Layout

- 최대 폭: 헤더·랜딩 `max-w-5xl~6xl` / 상품 그리드 `max-w-7xl` / 문서형 `max-w-4xl`. 좌우 `px-6`.
- 사이트 프레임 때문에 풀블리드 섹션은 `mx-2.5`(프레임 안쪽) 기준 — 푸터 참고.
- 간격: **4px 배수만** (`gap-1`~`gap-6`, 섹션 사이 `space-y-12`+).
- 반응형 분기: 마케팅 요소는 saas와 동일하게 **850px**(`max-[850px]:`)과 1200px, 일반 UI는 Tailwind 기본(`sm/md/lg`). 모바일 우선.
- 터치 타겟 최소 40×40px.

## 6. Motion

애니메이션 라이브러리: **`motion`** (`motion/react`). saas 템플릿과 동일.

- **이징 커브는 하나만**: `const ease = [0.23, 1, 0.32, 1]` — 모든 motion 전환에 이걸 쓴다.
- **blur-in 등장** (히어로, 랜딩 섹션): `hidden: { opacity: 0, y: 20, filter: "blur(8px)" }` → `visible`, duration 0.8, 부모에서 `staggerChildren: 0.15`
- **높이 펼침** (검색 패널, 모바일 메뉴, 아코디언): `height: 0 → "auto"` + opacity, 0.25~0.3s. CSS만으로 할 땐 grid-rows 트릭(FAQ 참고).
- **패럴랙스** (히어로 배경): `useMotionValue` + `useSpring({ damping: 25, stiffness: 150 })`, 강도 20px, 850px 미만에서 비활성.
- **아이콘 모핑**: 햄버거(두 줄 rotate ±45°), 화살표 CTA(`group-hover:-rotate-45`), 셰브론(`rotate-180`) — 전부 0.25~0.3s.
- **테마 전환**: AnimatedThemeToggler의 원형 clip-path 확산 700ms (View Transitions API).
- 일반 UI hover는 여전히 `transition-colors`만. **scale·이동 금지** (motion 진입 애니메이션 제외).
- `prefers-reduced-motion: reduce` 대응은 globals.css에 내장 — 자동으로 꺼진다.

## 7. Writing Tone

| 상황 | 규칙 | 예 |
|---|---|---|
| 버튼 | 동사로 끝나는 2~5자, "~하기" 통일 | 구매하기 / 다운로드 / 저장 |
| 취소 버튼 | 항상 "취소" | 취소 |
| 오류 | ①무엇이 잘못됐고 ②어떻게 하면 되는지 | "결제에 실패했습니다. 다시 시도해주세요." |
| 성공 | 결과 + 다음 행동 | "라이센스 키가 발급되었습니다. 주문 페이지에서 확인하세요." |
| 파괴 확인 | 되돌릴 수 없음 명시 | "삭제하면 되돌릴 수 없습니다." |
| 빈 상태 | 상황 설명 + 시작 액션 버튼 | "아직 상품이 없습니다" + [상품 추가하기] |
| 히어로 카피 | 짧은 명사구 2줄 + 강조 단어 1개 | "프리미엄 서버 에셋 / 라이센스와 함께 *안전하게*" |
| 존댓말 | 사용자 대상 문구는 해요체/합니다체 통일 | — |

---

## 새 페이지 체크리스트

- [ ] 색: 토큰 클래스만 (`bg-frame`, `text-muted-foreground`, ...) — slate/gray/white/orange 하드코딩 없음
- [ ] `(public)` 레이아웃 안이면 헤더 클리어런스 자동 — 밖이면 `pt-28 max-[850px]:pt-20` 직접
- [ ] 버튼: primary 1개, 마케팅 CTA는 화살표 CTA 패턴
- [ ] 모서리 위계 준수 (카드 2xl / 버튼·입력 xl / pill full)
- [ ] motion 쓸 때 ease `[0.23, 1, 0.32, 1]` + blur-in 패턴 재사용
- [ ] 다크모드로 한 번 훑기 (`/design` 토글) — 안 변하는 게 의도인지 확인
- [ ] 모든 인터랙티브 요소 `.focus-ring` 또는 ui 컴포넌트 사용
