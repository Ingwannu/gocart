import React from "react";
import Title from "./Title";
import { ourSpecsData } from "@/assets/assets";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const OurSpecs = () => {
	const { t } = useTranslation();

	const specTranslations = [
		{
			title: t("specs.privateDownloads"),
			description: t("specs.privateDownloadsDesc"),
		},
		{
			title: t("specs.versionedBundles"),
			description: t("specs.versionedBundlesDesc"),
		},
		{
			title: t("specs.sellerSupport"),
			description: t("specs.sellerSupportDesc"),
		},
	];

	return (
		<div className="px-6 my-20 max-w-6xl mx-auto">
			<Title
				visibleButton={false}
				title={t("sections.ourSpecifications")}
				description={t("descriptions.ourSpecsDesc")}
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 gap-y-10 mt-26">
				{ourSpecsData.map((spec, index) => {
					const translated = specTranslations[index];
					return (
						<div
							className="relative h-44 px-8 flex flex-col items-center justify-center w-full text-center border rounded-lg group"
							style={{
								backgroundColor: spec.accent + 10,
								borderColor: spec.accent + 30,
							}}
							key={index}
						>
							<h3 className="text-foreground font-medium">{translated.title}</h3>
							<p className="text-sm text-muted-foreground mt-3">
								{translated.description}
							</p>
							<div
								className="absolute -top-5 text-white size-10 flex items-center justify-center rounded-md group-hover:scale-105 transition"
								style={{ backgroundColor: spec.accent }}
							>
								<spec.icon size={20} />
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default OurSpecs;
