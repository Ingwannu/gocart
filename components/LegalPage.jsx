import { legalPages } from "@/lib/legal-pages.mjs";

export default function LegalPage({ page }) {
	return (
		<div className="mx-6 min-h-[70vh] text-muted-foreground">
			<div className="mx-auto my-16 max-w-4xl">
				<p className="text-xs font-medium uppercase tracking-wider text-foreground">
					Wicked Shop policies
				</p>
				<h1 className="mt-3 text-4xl font-semibold text-foreground">
					{page.title}
				</h1>
				<p className="mt-3 text-sm text-muted-foreground">
					Last updated {page.updatedAt}
				</p>
				<p className="mt-6 max-w-3xl text-sm leading-6">{page.summary}</p>
				<div className="mt-10 space-y-5">
					{page.sections.map((section) => (
						<section
							key={section.heading}
							className="rounded-lg border border-border bg-frame p-5"
						>
							<h2 className="text-lg font-semibold text-foreground">
								{section.heading}
							</h2>
							<p className="mt-2 text-sm leading-6">{section.body}</p>
						</section>
					))}
				</div>
				<div className="mt-10 rounded-lg bg-muted p-5 text-sm leading-6">
					Questions about these policies can be sent through the contact page.
					These pages are operational marketplace notices and are not legal
					advice.
				</div>
			</div>
		</div>
	);
}

export function generateLegalStaticParams() {
	return legalPages.map((page) => ({ slug: page.slug }));
}
