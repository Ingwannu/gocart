"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/cn";

// FAQ accordion ported from the saas template (motion/react swapped for CSS
// grid-rows transitions so it stays dependency-free).
const ITEM_KEYS = ["license", "refund", "download", "support", "custom"];

function FAQItem({ question, answer, isOpen, onToggle }) {
	return (
		<div
			onClick={onToggle}
			role="button"
			tabIndex={0}
			aria-expanded={isOpen}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onToggle();
				}
			}}
			className="focus-ring cursor-pointer rounded-2xl bg-frame p-5 shadow-sm sm:p-6"
		>
			<div className="flex w-full items-center justify-between gap-4 text-left">
				<span className="text-base font-medium text-foreground sm:text-lg">
					{question}
				</span>
				<ChevronDown
					className={cn(
						"h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
						isOpen && "rotate-180",
					)}
					aria-hidden="true"
				/>
			</div>
			<div
				className={cn(
					"grid transition-[grid-template-rows] duration-300 ease-out",
					isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
				)}
			>
				<div className="overflow-hidden">
					<p className="pt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
						{answer}
					</p>
				</div>
			</div>
		</div>
	);
}

export default function FAQ() {
	const { t } = useTranslation();
	const [openIndex, setOpenIndex] = useState(0);

	return (
		<section className="w-full bg-background px-6 py-20" aria-labelledby="faq-title">
			<div className="mx-auto max-w-3xl">
				<div className="mb-10 text-center">
					<h2 id="faq-title" className="text-3xl font-semibold text-foreground">
						{t("homeFaq.title")}
					</h2>
					<p className="mt-3 text-sm text-muted-foreground sm:text-base">
						{t("homeFaq.description")}
					</p>
				</div>
				<div className="space-y-3">
					{ITEM_KEYS.map((key, index) => (
						<FAQItem
							key={key}
							question={t(`homeFaq.items.${key}.q`)}
							answer={t(`homeFaq.items.${key}.a`)}
							isOpen={openIndex === index}
							onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
