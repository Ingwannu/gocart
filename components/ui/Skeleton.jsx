import { cn } from "@/lib/cn";

// Loading placeholder. Match the shape of the content it replaces
// (docs §4.7); never show a skeleton for less than ~150ms of loading.
export default function Skeleton({ className = "", ...props }) {
	return (
		<div
			aria-hidden="true"
			className={cn("animate-pulse rounded-xl bg-muted", className)}
			{...props}
		/>
	);
}
