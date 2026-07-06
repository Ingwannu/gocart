import { cn } from "@/lib/cn";

// Team_WICKED button. Rules (docs/design-system.md §4.1):
// - primary: the ONE main action on a screen (never two primaries side by side)
// - secondary: everything next to a primary
// - accent: marketing/CTA moments only (hero, pricing) — max one per view
// - ghost: toolbars, icon rows, low-emphasis inline actions
// - danger: destructive actions; always pair with a confirm step
const variants = {
	primary:
		"bg-foreground text-background hover:bg-foreground/90 disabled:hover:bg-foreground",
	secondary:
		"border border-border bg-frame text-foreground hover:bg-muted disabled:hover:bg-frame",
	accent:
		"bg-accent text-accent-foreground hover:brightness-95 disabled:hover:brightness-100",
	ghost: "text-foreground/80 hover:text-foreground hover:bg-foreground/5",
	danger: "bg-danger text-white hover:brightness-110 disabled:hover:brightness-100",
};

const sizes = {
	sm: "px-4 py-1.5 text-xs rounded-lg gap-1.5",
	md: "px-6 py-2.5 text-sm rounded-xl gap-2",
	lg: "px-8 py-3 text-base rounded-xl gap-2",
	icon: "h-10 w-10 rounded-xl",
};

export default function Button({
	variant = "primary",
	size = "md",
	className = "",
	type = "button",
	...props
}) {
	return (
		<button
			type={type}
			className={cn(
				"focus-ring inline-flex items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
				variants[variant] || variants.primary,
				sizes[size] || sizes.md,
				className,
			)}
			{...props}
		/>
	);
}
