"use client";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useState } from "react";
import toast from "react-hot-toast";

const emptyForm = {
	name: "",
	email: "",
	subject: "",
	message: "",
};

export default function ContactPage() {
	const { t } = useTranslation();
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);

	const updateForm = (field, value) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const submitTicket = async (event) => {
		event.preventDefault();
		setSaving(true);
		try {
			await fetchJson("/api/support-tickets", {
				method: "POST",
				body: JSON.stringify(form),
			});
			setForm(emptyForm);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="mx-6 min-h-[70vh] text-muted-foreground">
			<div className="mx-auto my-16 grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px]">
				<div>
					<h1 className="text-4xl font-semibold text-foreground">
						{t("contact.title")}
					</h1>
					<p className="mt-4 max-w-xl text-sm leading-6">
						{t("contact.subtitle")}
					</p>
					<div className="mt-8 space-y-3 text-sm">
						<p>
							<span className="font-medium text-foreground">
								{t("contact.supportHours")}
							</span>{" "}
							{t("contact.supportHoursValue")}
						</p>
						<p>
							<span className="font-medium text-foreground">
								{t("contact.responseTime")}
							</span>{" "}
							{t("contact.responseTimeValue")}
						</p>
					</div>
				</div>

				<form
					onSubmit={(event) =>
						toast.promise(submitTicket(event), {
							loading: t("contact.sending"),
							success: t("contact.sent"),
							error: (error) => error.message,
						})
					}
					className="rounded-lg border border-border bg-frame p-5"
				>
					<div className="grid gap-4">
						<label className="text-sm">
							{t("contact.name")}
							<input
								className="mt-1 w-full rounded border border-border bg-frame p-2"
								value={form.name}
								onChange={(event) => updateForm("name", event.target.value)}
								required
							/>
						</label>
						<label className="text-sm">
							{t("contact.email")}
							<input
								type="email"
								className="mt-1 w-full rounded border border-border bg-frame p-2"
								value={form.email}
								onChange={(event) => updateForm("email", event.target.value)}
								required
							/>
						</label>
						<label className="text-sm">
							{t("contact.subject")}
							<input
								className="mt-1 w-full rounded border border-border bg-frame p-2"
								value={form.subject}
								onChange={(event) => updateForm("subject", event.target.value)}
								required
							/>
						</label>
						<label className="text-sm">
							{t("contact.message")}
							<textarea
								className="mt-1 min-h-36 w-full rounded border border-border bg-frame p-2"
								value={form.message}
								onChange={(event) => updateForm("message", event.target.value)}
								required
							/>
						</label>
					</div>
					<button
						disabled={saving}
						className="mt-5 rounded bg-accent px-5 py-2 text-sm text-accent-foreground hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t("contact.send")}
					</button>
				</form>
			</div>
		</div>
	);
}
