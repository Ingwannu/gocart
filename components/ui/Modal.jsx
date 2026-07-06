"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

// Modal dialog. Rules (docs §4.4): one modal at a time, always closable via
// Escape / backdrop / X, primary action on the right of the footer.
export default function Modal({ open, onClose, title, children, footer, className = "" }) {
	useEffect(() => {
		if (!open) return undefined;
		const onKeyDown = (event) => {
			if (event.key === "Escape") onClose?.();
		};
		document.addEventListener("keydown", onKeyDown);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = "";
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-label={typeof title === "string" ? title : undefined}
		>
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
			/>
			<div
				className={cn(
					"relative w-full max-w-md rounded-2xl border border-border bg-frame p-6 shadow-lg",
					className,
				)}
			>
				<div className="mb-4 flex items-start justify-between gap-4">
					<h2 className="text-lg font-semibold text-foreground">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="focus-ring -m-1 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						<X size={18} />
					</button>
				</div>
				<div className="text-sm text-foreground">{children}</div>
				{footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
			</div>
		</div>
	);
}
