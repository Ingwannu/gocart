// Tiny className combiner (shadcn-style API without the clsx dependency).
// cn("a", cond && "b", "c") -> "a c" when cond is falsy.
export function cn(...values) {
	return values.filter(Boolean).join(" ");
}
