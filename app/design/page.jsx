"use client";
import { useState } from "react";
import { ArrowDownRight, Download, ShoppingCart, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card, { CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/Field";
import Switch from "@/components/ui/Switch";
import Slider from "@/components/ui/Slider";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import AnimatedThemeToggler from "@/components/ui/AnimatedThemeToggler";

const TOKENS = [
	["background", "페이지 배경"],
	["frame", "카드/서피스 배경"],
	["foreground", "본문 텍스트"],
	["muted", "약한 배경"],
	["muted-foreground", "보조 텍스트"],
	["border", "테두리"],
	["accent", "브랜드 액센트"],
	["accent-soft", "액센트 연한 배경"],
	["danger", "위험/오류"],
	["success", "성공"],
	["warning", "경고"],
	["ring", "포커스 링"],
];

function Section({ title, children }) {
	return (
		<section className="space-y-4">
			<h2 className="text-xl font-semibold text-foreground">{title}</h2>
			{children}
		</section>
	);
}

export default function DesignSystemPage() {
	const [switchOn, setSwitchOn] = useState(true);
	const [slider, setSlider] = useState(40);
	const [modalOpen, setModalOpen] = useState(false);
	const [tab, setTab] = useState("plugins");

	return (
		<main className="min-h-screen bg-background px-6 py-12 text-foreground">
			<div className="mx-auto max-w-4xl space-y-12">
				<header className="flex items-start justify-between gap-4">
					<div>
						<Badge variant="accent" className="mb-3 uppercase">
							Team_WICKED
						</Badge>
						<h1 className="text-3xl font-bold">Design System</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							살아있는 스타일 가이드 — 규칙 문서는{" "}
							<code className="rounded bg-muted px-1.5 py-0.5">docs/design-system.md</code>
						</p>
					</div>
					<AnimatedThemeToggler />
				</header>

				<Section title="1. Colors — 디자인 토큰">
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
						{TOKENS.map(([token, label]) => (
							<div key={token} className="rounded-xl border border-border bg-frame p-3">
								<div
									className="mb-2 h-10 rounded-lg border border-border"
									style={{ backgroundColor: `var(--${token})` }}
								/>
								<p className="font-mono text-xs text-foreground">--{token}</p>
								<p className="text-xs text-muted-foreground">{label}</p>
							</div>
						))}
					</div>
				</Section>

				<Section title="2. Typography">
					<Card className="space-y-3">
						<p className="text-3xl font-bold">페이지 제목 · text-3xl font-bold</p>
						<p className="text-xl font-semibold">섹션 제목 · text-xl font-semibold</p>
						<p className="text-base font-semibold">카드 제목 · text-base font-semibold</p>
						<p className="text-sm">본문 · text-sm (기본)</p>
						<p className="text-sm text-muted-foreground">보조 텍스트 · text-sm muted-foreground</p>
						<p className="text-xs text-muted-foreground">캡션 · text-xs muted-foreground</p>
						<p className="font-mono text-sm">모노스페이스: WS-ABCDE-FGHJK · 라이센스 키, 코드</p>
					</Card>
				</Section>

				<Section title="3. Buttons">
					<Card className="space-y-4">
						<div className="flex flex-wrap items-center gap-3">
							<Button>Primary</Button>
							<Button variant="secondary">Secondary</Button>
							<Button variant="accent">Accent CTA</Button>
							<Button variant="ghost">Ghost</Button>
							<Button variant="danger">Danger</Button>
							<Button disabled>Disabled</Button>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							<Button size="sm" variant="secondary">
								Small
							</Button>
							<Button size="md" variant="secondary">
								Medium
							</Button>
							<Button size="lg" variant="secondary">
								Large
							</Button>
							<Button size="icon" variant="secondary" aria-label="Download">
								<Download size={18} />
							</Button>
							<Button variant="accent">
								<ShoppingCart size={16} /> 구매하기
							</Button>
						</div>
					</Card>
				</Section>

				<Section title="3.5 화살표 CTA (saas 시그니처)">
					<Card className="space-y-3">
						<button type="button" className="group relative inline-flex cursor-pointer items-center">
							<span className="absolute inset-y-0 right-0 w-[calc(100%-2rem)] rounded-xl bg-accent" />
							<span className="relative z-10 rounded-xl bg-foreground px-6 py-3 font-medium text-background">
								상점 둘러보기
							</span>
							<span className="relative -left-px z-10 flex h-11 w-11 items-center justify-center rounded-xl text-accent-foreground">
								<ArrowDownRight className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-45" />
							</span>
						</button>
						<p className="text-xs text-muted-foreground">
							마케팅 CTA 전용 (히어로, 헤더 로그인). hover 시 화살표가 45° 회전 — 규칙은 문서 §4.2
						</p>
					</Card>
				</Section>

				<Section title="4. Badges">
					<Card>
						<div className="flex flex-wrap items-center gap-3">
							<Badge variant="accent">NEW</Badge>
							<Badge variant="neutral">Neutral</Badge>
							<Badge variant="outline">Outline</Badge>
							<Badge variant="success">결제 완료</Badge>
							<Badge variant="warning">검토 대기</Badge>
							<Badge variant="danger">회수됨</Badge>
						</div>
					</Card>
				</Section>

				<Section title="5. Cards">
					<div className="grid gap-4 sm:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>디스코드 봇 키트</CardTitle>
								<CardDescription>TypeScript · 라이센스 포함</CardDescription>
							</CardHeader>
							<p className="text-sm text-muted-foreground">
								카드는 rounded-2xl + bg-frame + border. 페이지 배경(bg-background) 위에서
								한 단계 떠 보이게.
							</p>
							<CardFooter>
								<Button size="sm">구매</Button>
								<Button size="sm" variant="ghost">
									미리보기
								</Button>
							</CardFooter>
						</Card>
						<Card className="border-accent bg-accent-soft">
							<CardHeader>
								<CardTitle>강조 카드</CardTitle>
								<CardDescription>추천 요금제 등 딱 한 곳에만</CardDescription>
							</CardHeader>
							<Badge variant="accent">BEST</Badge>
						</Card>
					</div>
				</Section>

				<Section title="6. Form — Input / Select / Textarea">
					<Card className="space-y-4">
						<div>
							<Label htmlFor="ds-name">상품명</Label>
							<Input id="ds-name" placeholder="예: CrazySurvival 서버팩" />
							<FieldHint>구매자에게 표시되는 이름입니다.</FieldHint>
						</div>
						<div>
							<Label htmlFor="ds-price">가격</Label>
							<Input id="ds-price" invalid defaultValue="-5" />
							<FieldError>가격은 0보다 커야 합니다.</FieldError>
						</div>
						<div>
							<Label htmlFor="ds-cat">카테고리</Label>
							<Select id="ds-cat" defaultValue="discord-bots">
								<option value="discord-bots">디스코드 봇</option>
								<option value="mc-plugins">마인크래프트 플러그인</option>
								<option value="server-packs">서버팩</option>
							</Select>
						</div>
						<div>
							<Label htmlFor="ds-desc">설명</Label>
							<Textarea id="ds-desc" placeholder="상품 설명..." rows={3} />
						</div>
					</Card>
				</Section>

				<Section title="7. Switch / Slider / Tabs">
					<Card className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">판매 활성화</p>
								<p className="text-xs text-muted-foreground">끄면 상점에서 숨겨집니다</p>
							</div>
							<Switch checked={switchOn} onChange={setSwitchOn} />
						</div>
						<div>
							<Label>할인율 ({slider}%)</Label>
							<Slider value={slider} onChange={setSlider} showValue />
						</div>
						<Tabs
							value={tab}
							onChange={setTab}
							tabs={[
								{ value: "plugins", label: "플러그인" },
								{ value: "bots", label: "디코봇" },
								{ value: "packs", label: "서버팩" },
							]}
						/>
					</Card>
				</Section>

				<Section title="8. Alerts">
					<div className="space-y-3">
						<Alert variant="info" title="안내">
							새 버전 v2.1이 출시되었습니다.
						</Alert>
						<Alert variant="success" title="결제 완료">
							라이센스 키가 발급되었습니다. 주문 페이지에서 확인하세요.
						</Alert>
						<Alert variant="warning" title="확인 필요">
							이 상품은 아직 파일이 업로드되지 않았습니다.
						</Alert>
						<Alert variant="danger" title="오류">
							결제에 실패했습니다. 다시 시도해주세요.
						</Alert>
					</div>
				</Section>

				<Section title="9. Modal / Skeleton">
					<Card className="space-y-4">
						<Button variant="danger" onClick={() => setModalOpen(true)}>
							<Trash2 size={16} /> 상품 삭제
						</Button>
						<div className="space-y-2">
							<Skeleton className="h-4 w-2/3" />
							<Skeleton className="h-4 w-1/2" />
							<Skeleton className="h-24 w-full" />
						</div>
					</Card>
					<Modal
						open={modalOpen}
						onClose={() => setModalOpen(false)}
						title="상품을 삭제할까요?"
						footer={
							<>
								<Button variant="secondary" onClick={() => setModalOpen(false)}>
									취소
								</Button>
								<Button variant="danger" onClick={() => setModalOpen(false)}>
									삭제
								</Button>
							</>
						}
					>
						삭제하면 되돌릴 수 없습니다. 진행 중인 주문에는 영향을 주지 않습니다.
					</Modal>
				</Section>
			</div>
		</main>
	);
}
