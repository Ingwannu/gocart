"use client";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function AboutPage() {
	const { t } = useTranslation();

	const items = [
		t("about.curated"),
		t("about.sellerManaged"),
		t("about.supported"),
	];

	return (
		<div className="mx-6 min-h-[70vh] text-muted-foreground">
			<div className="mx-auto my-16 max-w-5xl">
				<h1 className="text-4xl font-semibold text-foreground">
					{t("about.title")}
				</h1>
				<p className="mt-4 max-w-3xl text-sm leading-6">{t("about.subtitle")}</p>
				<div className="mt-10 grid gap-4 md:grid-cols-3">
					{items.map((item) => (
						<div
							key={item}
							className="rounded-lg border border-border bg-frame p-5"
						>
							<p className="text-sm leading-6">{item}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
