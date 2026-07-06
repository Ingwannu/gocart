import { cn } from "@/lib/cn";

const fieldBase =
	"focus-ring w-full rounded-xl border border-border bg-frame px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Label({ className = "", ...props }) {
	return (
		<label
			className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}
			{...props}
		/>
	);
}

export function Input({ className = "", invalid = false, ...props }) {
	return (
		<input
			className={cn(fieldBase, invalid && "border-danger", className)}
			aria-invalid={invalid || undefined}
			{...props}
		/>
	);
}

export function Textarea({ className = "", invalid = false, rows = 4, ...props }) {
	return (
		<textarea
			rows={rows}
			className={cn(fieldBase, "resize-y", invalid && "border-danger", className)}
			aria-invalid={invalid || undefined}
			{...props}
		/>
	);
}

export function Select({ className = "", invalid = false, children, ...props }) {
	return (
		<select
			className={cn(fieldBase, "appearance-none", invalid && "border-danger", className)}
			aria-invalid={invalid || undefined}
			{...props}
		>
			{children}
		</select>
	);
}

export function FieldError({ className = "", children, ...props }) {
	if (!children) return null;
	return (
		<p className={cn("mt-1.5 text-xs text-danger", className)} {...props}>
			{children}
		</p>
	);
}

export function FieldHint({ className = "", children, ...props }) {
	if (!children) return null;
	return (
		<p className={cn("mt-1.5 text-xs text-muted-foreground", className)} {...props}>
			{children}
		</p>
	);
}
