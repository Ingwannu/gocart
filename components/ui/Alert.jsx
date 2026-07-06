import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const variants = {
	info: { icon: Info, classes: "border-border bg-muted text-foreground" },
	success: { icon: CheckCircle2, classes: "border-success/30 bg-success-soft text-success" },
	warning: { icon: AlertTriangle, classes: "border-warning/30 bg-warning-soft text-warning" },
	danger: { icon: XCircle, classes: "border-danger/30 bg-danger-soft text-danger" },
};

export default function Alert({ variant = "info", title, children, className = "" }) {
	const { icon: Icon, classes } = variants[variant] || variants.info;
	return (
		<div
			role={variant === "danger" || variant === "warning" ? "alert" : "status"}
			className={cn("flex gap-3 rounded-xl border p-4 text-sm", classes, className)}
		>
			<Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
			<div>
				{title && <p className="mb-0.5 font-semibold">{title}</p>}
				<div className={cn(title && "opacity-90")}>{children}</div>
			</div>
		</div>
	);
}
