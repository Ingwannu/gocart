"use client";
import Loading from "@/components/Loading";
import SettingsNav from "@/components/admin/SettingsNav";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const emptySettings = {
	fromAddress: "",
	apiKey: "",
};

export default function AdminEmailSettings() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [settings, setSettings] = useState(emptySettings);
	const [hasApiKey, setHasApiKey] = useState(false);

	useEffect(() => {
		fetchJson("/api/settings/email")
			.then((data) => {
				setSettings({
					fromAddress: data.settings?.fromAddress || "",
					apiKey: "",
				});
				setHasApiKey(Boolean(data.settings?.apiKeyMasked));
			})
			.catch((error) => toast.error(error.message))
			.finally(() => setLoading(false));
	}, []);

	const update = (field, value) => {
		setSettings((prev) => ({ ...prev, [field]: value }));
	};

	const save = async (event) => {
		event.preventDefault();
		setSaving(true);
		try {
			const data = await toast.promise(
				fetchJson("/api/settings/email", {
					method: "POST",
					body: JSON.stringify(settings),
				}),
				{
					loading: t("admin.emailSaving"),
					success: t("admin.emailSaved"),
					error: (error) => error.message,
				},
			);
			setSettings({
				fromAddress: data.settings?.fromAddress || "",
				apiKey: "",
			});
			setHasApiKey(Boolean(data.settings?.apiKeyMasked));
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <Loading />;

	return (
		<div className="max-w-2xl">
			<h1 className="mb-5 text-2xl text-muted-foreground">
				{t("admin.emailSettings")}
			</h1>
			<SettingsNav />
			<form
				onSubmit={save}
				className="space-y-5 rounded-md border border-border bg-frame p-5"
			>
				<label className="block text-sm font-medium text-foreground">
					{t("admin.emailFromAddress")}
					<input
						type="text"
						value={settings.fromAddress}
						onChange={(event) => update("fromAddress", event.target.value)}
						placeholder="Wicked Shop <noreply@example.com>"
						className="mt-1 w-full rounded border border-border p-2 text-sm"
					/>
				</label>
				<label className="block text-sm font-medium text-foreground">
					{t("admin.resendApiKey")}
					<input
						type="password"
						value={settings.apiKey}
						onChange={(event) => update("apiKey", event.target.value)}
						placeholder={hasApiKey ? "••••••••" : "re_..."}
						className="mt-1 w-full rounded border border-border p-2 text-sm"
						autoComplete="new-password"
					/>
				</label>
				<div className="flex justify-end">
					<button
						type="submit"
						disabled={saving}
						className="rounded bg-accent px-5 py-2 text-sm text-accent-foreground hover:brightness-95 disabled:opacity-50"
					>
						{saving ? t("admin.emailSaving") : t("admin.emailSave")}
					</button>
				</div>
			</form>
		</div>
	);
}
