"use client";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

const PageTitle = ({ heading, text, path = "/", linkText }) => {
	return (
		<div className="my-6">
			<h2 className="text-2xl font-semibold">{heading}</h2>
			<div className="flex items-center gap-3">
				<p className="text-muted-foreground">{text}</p>
				{linkText && (
					<Link
						href={path}
						className="flex items-center gap-1 text-foreground font-medium text-sm"
					>
						{linkText} <ArrowRightIcon size={14} />
					</Link>
				)}
			</div>
		</div>
	);
};

export default PageTitle;
