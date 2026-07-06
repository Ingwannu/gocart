import { cn } from "@/lib/cn";

// Surface container. bg-frame pops against the page bg-background; keep cards
// on rounded-2xl and interactive children on rounded-xl (docs §4.2).
export default function Card({ className = "", ...props }) {
	return (
		<div
			className={cn(
				"rounded-2xl border border-border bg-frame p-5 shadow-sm sm:p-6",
				className,
			)}
			{...props}
		/>
	);
}

export function CardHeader({ className = "", ...props }) {
	return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function CardTitle({ className = "", ...props }) {
	return (
		<h3 className={cn("text-base font-semibold text-foreground", className)} {...props} />
	);
}

export function CardDescription({ className = "", ...props }) {
	return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardFooter({ className = "", ...props }) {
	return (
		<div
			className={cn("mt-4 flex items-center gap-2 border-t border-border pt-4", className)}
			{...props}
		/>
	);
}
