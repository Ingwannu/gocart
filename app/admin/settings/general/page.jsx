"use client";
import Loading from "@/components/Loading";
import SettingsNav from "@/components/admin/SettingsNav";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const emptySettings = {
	publicUrl: "",
	currencySymbol: "$",
};

export default function AdminGeneralSettings() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [settings, setSettings] = useState(emptySettings);

	useEffect(() => {
		fetchJson("/api/settings/general")
			.then((data) => {
				setSettings({
					publicUrl: data.settings?.publicUrl || "",
					currencySymbol: data.settings?.currencySymbol || "$",
				});
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
				fetchJson("/api/settings/general", {
					method: "POST",
					body: JSON.stringify(settings),
				}),
				{
					loading: t("admin.settingsSaving"),
					success: t("admin.settingsSaved"),
					error: (error) => error.message,
				},
			);
			setSettings({
				publicUrl: data.settings?.publicUrl || "",
				currencySymbol: data.settings?.currencySymbol || "$",
			});
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <Loading />;

	return (
		<div className="max-w-2xl">
			<h1 className="mb-5 text-2xl text-slate-500">
				{t("admin.generalSettings")}
			</h1>
			<SettingsNav />
			<form
				onSubmit={save}
				className="space-y-5 rounded-md border border-gray-200 bg-white p-5"
			>
				<label className="block text-sm font-medium text-slate-700">
					{t("admin.publicUrl")}
					<input
						type="url"
						value={settings.publicUrl}
						onChange={(event) => update("publicUrl", event.target.value)}
						placeholder="https://shop.example.com"
						className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
					/>
				</label>
				<label className="block text-sm font-medium text-slate-700">
					{t("admin.currencySymbol")}
					<input
						type="text"
						value={settings.currencySymbol}
						onChange={(event) => update("currencySymbol", event.target.value)}
						className="mt-1 w-32 rounded border border-slate-200 p-2 text-sm"
						maxLength={8}
					/>
				</label>
				<div className="flex justify-end">
					<button
						type="submit"
						disabled={saving}
						className="rounded bg-[#1A1A1A] px-5 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-50"
					>
						{saving ? t("admin.settingsSaving") : t("admin.settingsSave")}
					</button>
				</div>
			</form>
		</div>
	);
}
