"use client";
import { cn } from "@/lib/cn";

// Range slider. Native <input type="range"> themed via accent-color so the
// thumb/track follow the WICKED accent in both light and dark mode.
export default function Slider({
	min = 0,
	max = 100,
	step = 1,
	value,
	onChange,
	showValue = false,
	className = "",
	...props
}) {
	return (
		<div className={cn("flex w-full items-center gap-3", className)}>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(event) => onChange?.(Number(event.target.value))}
				className="focus-ring h-2 w-full cursor-pointer appearance-auto rounded-full disabled:cursor-not-allowed disabled:opacity-50"
				style={{ accentColor: "var(--accent)" }}
				{...props}
			/>
			{showValue && (
				<span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
					{value}
				</span>
			)}
		</div>
	);
}
