"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const Title = ({ title, description, visibleButton = true, href = "" }) => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col items-center">
			<h2 className="text-2xl font-semibold text-foreground">{title}</h2>
			<Link
				href={href}
				className="flex items-center gap-5 text-sm text-muted-foreground mt-2"
			>
				<p className="max-w-lg text-center">{description}</p>
				{visibleButton && (
					<button className="text-foreground font-medium flex items-center gap-1">
						{t("common.viewMore")} <ArrowRight size={14} />
					</button>
				)}
			</Link>
		</div>
	);
};

export default Title;
