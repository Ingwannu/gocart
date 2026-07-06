import { cn } from "@/lib/cn";

const variants = {
	accent: "bg-accent text-accent-foreground",
	neutral: "bg-muted text-muted-foreground",
	outline: "border border-border bg-frame text-foreground",
	success: "bg-success-soft text-success",
	warning: "bg-warning-soft text-warning",
	danger: "bg-danger-soft text-danger",
};

export default function Badge({ variant = "neutral", className = "", ...props }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
				variants[variant] || variants.neutral,
				className,
			)}
			{...props}
		/>
	);
}
