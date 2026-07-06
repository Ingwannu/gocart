"use client";
import { ArrowRight, Facebook, Instagram, Linkedin, Mail, Twitter } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import {
	getFooterContactLinks,
	getFooterProductLinks,
} from "@/lib/footer-links.mjs";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { getLegalFooterLinks } from "@/lib/legal-pages.mjs";
import { fetchJson } from "@/lib/http";

// Footer ported from the saas template: a floating CTA card with the
// newsletter form hovering over a full-width accent block that holds the link
// columns. The accent block stays lime in both themes (fixed dark text).
const Footer = () => {
	const { t } = useTranslation();
	const [email, setEmail] = useState("");
	const [saving, setSaving] = useState(false);

	const subscribe = async (event) => {
		event.preventDefault();
		setSaving(true);
		try {
			await fetchJson("/api/newsletter", {
				method: "POST",
				body: JSON.stringify({ email }),
			});
			setEmail("");
		} finally {
			setSaving(false);
		}
	};

	const linkSections = [
		{
			title: t("footer.products"),
			links: getFooterProductLinks().map((link) => ({
				text: t(link.labelKey),
				path: link.href,
			})),
		},
		{
			title: t("footer.website"),
			links: [
				{ text: t("common.home"), path: "/" },
				{ text: t("common.stores"), path: "/stores" },
				...getLegalFooterLinks().map((link) => ({
					text: t(link.labelKey),
					path: link.href,
				})),
				{ text: t("footer.becomePlusMember"), path: "/pricing" },
				{ text: t("footer.createYourStore"), path: "/create-store" },
			],
		},
		{
			title: t("footer.contactSection"),
			links: getFooterContactLinks().map((link) => ({
				text: link.label,
				path: link.href,
			})),
		},
	];

	const socialLinks = [
		{ icon: Facebook, href: "https://www.facebook.com", label: "Facebook" },
		{ icon: Instagram, href: "https://www.instagram.com", label: "Instagram" },
		{ icon: Twitter, href: "https://twitter.com", label: "Twitter" },
		{ icon: Linkedin, href: "https://www.linkedin.com", label: "LinkedIn" },
	];

	return (
		<footer className="relative mx-2.5 mt-24 pt-38 max-[850px]:mx-0">
			{/* Floating CTA card */}
			<div className="absolute left-1/2 top-0 w-full max-w-5xl -translate-x-1/2 px-2.5 max-[850px]:px-4">
				<div className="relative w-full overflow-hidden rounded-3xl shadow-2xl/15">
					<div
						className="absolute inset-0"
						style={{
							backgroundImage:
								"radial-gradient(80% 120% at 20% 0%, #dff2ae 0%, #a8d946 55%, #8fc32e 100%)",
						}}
						aria-hidden="true"
					/>
					<div className="relative z-10 flex flex-col items-center px-12 py-20 text-center max-[850px]:px-6 max-[850px]:py-10">
						<h2 className="mb-12 max-w-2xl text-5xl font-medium tracking-tight text-neutral-900 max-[850px]:mb-8 max-[850px]:text-3xl">
							{t("hero.ctaHeadline")}
						</h2>
						<form
							onSubmit={(event) =>
								toast.promise(subscribe(event), {
									loading: t("descriptions.newsletterSaving"),
									success: t("descriptions.newsletterSaved"),
									error: (error) => error.message,
								})
							}
							className="flex w-full max-w-md items-center rounded-xl bg-background p-1.5 shadow-lg max-[850px]:max-w-none max-[850px]:flex-col max-[850px]:gap-3 max-[850px]:p-3"
						>
							<div className="flex w-full flex-1 items-center">
								<Mail
									className="ml-3 h-5 w-5 flex-none text-muted-foreground max-[850px]:ml-1"
									aria-hidden="true"
								/>
								<input
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									placeholder={t("descriptions.newsletterPlaceholder")}
									aria-label={t("descriptions.newsletterPlaceholder")}
									required
									className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
								/>
							</div>
							<button
								type="submit"
								disabled={saving}
								className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60 max-[850px]:w-full max-[850px]:py-3"
							>
								{t("descriptions.getUpdates")}
								<ArrowRight className="h-4 w-4" aria-hidden="true" />
							</button>
						</form>
					</div>
				</div>
			</div>

			{/* Accent block with link columns */}
			<div className="rounded-tl-[3rem] rounded-tr-[3rem] bg-accent pb-14 pt-80 max-[850px]:pt-72">
				<div className="mx-auto max-w-5xl px-6">
					<div className="flex items-start justify-between gap-12 max-[850px]:flex-col max-[850px]:gap-10">
						<div>
							<Link href="/" className="relative text-3xl font-semibold text-neutral-900">
								wicked shop<span className="text-4xl leading-0">.</span>
							</Link>
							<p className="mt-4 max-w-[300px] text-sm text-neutral-900/70">
								{t("footer.welcome")}
							</p>
							<div className="mt-5 flex items-center gap-2">
								{socialLinks.map((item) => (
									<Link
										key={item.label}
										href={item.href}
										aria-label={item.label}
										className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/10 text-neutral-900 transition-colors hover:bg-neutral-900/20"
									>
										<item.icon size={16} />
									</Link>
								))}
							</div>
						</div>

						<nav
							className="flex gap-16 max-[1000px]:gap-10 max-[850px]:flex-wrap"
							aria-label="Footer navigation"
						>
							{linkSections.map((section) => (
								<div key={section.title}>
									<h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-900/50">
										{section.title}
									</h3>
									<ul className="space-y-2">
										{section.links.map((link, i) => (
											<li key={`${section.title}-${i}`}>
												<Link
													href={link.path}
													className="text-sm text-neutral-900 transition-colors hover:text-neutral-900/70"
												>
													{link.text}
												</Link>
											</li>
										))}
									</ul>
								</div>
							))}
						</nav>
					</div>

					<div className="mt-16 pt-6">
						<p className="text-center text-sm text-neutral-900/50">
							{t("footer.copyright")}
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
