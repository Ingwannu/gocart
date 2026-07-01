"use client";
import Loading from "@/components/Loading";
import SettingsNav from "@/components/admin/SettingsNav";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { HardDriveIcon, CloudIcon } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const emptySettings = {
	backend: "local",
	endpoint: "",
	region: "auto",
	bucket: "",
	accessKeyId: "",
	secretAccessKey: "",
	forcePathStyle: true,
};

const PLACEHOLDER_REGIONS = [
	"auto",
	"us-east-1",
	"eu-west-1",
	"ap-northeast-2",
];

export default function AdminStorageSettings() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [settings, setSettings] = useState(emptySettings);
	const [hasSecret, setHasSecret] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		fetchJson("/api/settings/storage")
			.then((data) => {
				const s = data.settings || {};
				setSettings({
					backend: s.backend || "local",
					endpoint: s.endpoint || "",
					region: s.region || "auto",
					bucket: s.bucket || "",
					accessKeyId: s.accessKeyId || "",
					secretAccessKey: "",
					forcePathStyle: s.forcePathStyle !== false,
				});
				setHasSecret(Boolean(s.secretAccessKeyMasked));
			})
			.catch((error) => toast.error(error.message))
			.finally(() => setLoading(false));
	}, []);

	const update = (field, value) => {
		setSettings((prev) => ({ ...prev, [field]: value }));
	};

	const save = async (event) => {
		event.preventDefault();
		if (settings.backend === "s3") {
			if (!settings.bucket.trim() || !settings.accessKeyId.trim()) {
				toast.error(t("admin.storageBackendRequiresBucket"));
				return;
			}
			if (!hasSecret && !settings.secretAccessKey.trim()) {
				toast.error(t("admin.storageBackendRequiresSecretKey"));
				return;
			}
		}
		setSaving(true);
		try {
			await toast.promise(
				fetchJson("/api/settings/storage", {
					method: "POST",
					body: JSON.stringify(settings),
				}),
				{
					loading: t("admin.storageSaving"),
					success: t("admin.storageSaved"),
					error: (error) => error.message,
				},
			);
			setSettings((prev) => ({ ...prev, secretAccessKey: "" }));
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <Loading />;

	return (
		<div className="max-w-2xl">
			<h1 className="text-2xl text-slate-500 mb-5">
				{t("admin.storageSettings")}
			</h1>
			<SettingsNav />
			<form
				onSubmit={save}
				className="rounded-md border border-gray-200 bg-white p-5 space-y-5"
			>
				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">
						{t("admin.storageBackend")}
					</label>
					<div className="grid gap-2 sm:grid-cols-2">
						<button
							type="button"
							onClick={() => update("backend", "local")}
							className={`flex items-center gap-3 rounded-md border p-3 text-left text-sm transition ${
								settings.backend === "local"
									? "border-orange-400 bg-orange-50 text-slate-800"
									: "border-slate-200 hover:bg-slate-50 text-slate-600"
							}`}
						>
							<HardDriveIcon size={18} />
							<div>
								<p className="font-medium">{t("admin.storageLocal")}</p>
							</div>
						</button>
						<button
							type="button"
							onClick={() => update("backend", "s3")}
							className={`flex items-center gap-3 rounded-md border p-3 text-left text-sm transition ${
								settings.backend === "s3"
									? "border-orange-400 bg-orange-50 text-slate-800"
									: "border-slate-200 hover:bg-slate-50 text-slate-600"
							}`}
						>
							<CloudIcon size={18} />
							<div>
								<p className="font-medium">{t("admin.storageS3")}</p>
							</div>
						</button>
					</div>
					<p className="mt-2 text-xs text-slate-400">
						{t("admin.storageBackendHint")}
					</p>
				</div>

				{settings.backend === "s3" ? (
					<>
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								{t("admin.s3Endpoint")}
							</label>
							<input
								type="url"
								value={settings.endpoint}
								onChange={(e) => update("endpoint", e.target.value)}
								placeholder="https://<account>.r2.cloudflarestorage.com"
								className="w-full rounded border border-slate-200 p-2 text-sm"
							/>
							<p className="mt-1 text-xs text-slate-400">
								{t("admin.s3EndpointHint")}
							</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								{t("admin.s3Region")}
							</label>
							<input
								list="region-list"
								value={settings.region}
								onChange={(e) => update("region", e.target.value)}
								placeholder="auto"
								className="w-full rounded border border-slate-200 p-2 text-sm"
							/>
							<datalist id="region-list">
								{PLACEHOLDER_REGIONS.map((r) => (
									<option key={r} value={r} />
								))}
							</datalist>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								{t("admin.s3Bucket")}
							</label>
							<input
								type="text"
								value={settings.bucket}
								onChange={(e) => update("bucket", e.target.value)}
								placeholder="my-source-code-bucket"
								className="w-full rounded border border-slate-200 p-2 text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								{t("admin.s3AccessKeyId")}
							</label>
							<input
								type="text"
								value={settings.accessKeyId}
								onChange={(e) => update("accessKeyId", e.target.value)}
								placeholder="AKIA..."
								className="w-full rounded border border-slate-200 p-2 text-sm"
								autoComplete="off"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								{t("admin.s3SecretAccessKey")}
							</label>
							<input
								type="password"
								value={settings.secretAccessKey}
								onChange={(e) => update("secretAccessKey", e.target.value)}
								placeholder={hasSecret ? "••••••••" : ""}
								className="w-full rounded border border-slate-200 p-2 text-sm"
								autoComplete="new-password"
							/>
							{hasSecret ? (
								<p className="mt-1 text-xs text-slate-400">
									{t("admin.s3SecretHint")}
								</p>
							) : null}
						</div>
						<label className="flex items-start gap-2 text-sm text-slate-700">
							<input
								type="checkbox"
								checked={settings.forcePathStyle}
								onChange={(e) => update("forcePathStyle", e.target.checked)}
								className="mt-1"
							/>
							<span>
								<span className="font-medium">
									{t("admin.s3ForcePathStyle")}
								</span>
								<span className="block text-xs text-slate-400">
									{t("admin.s3ForcePathStyleHint")}
								</span>
							</span>
						</label>
					</>
				) : null}

				<div className="flex justify-end">
					<button
						type="submit"
						disabled={saving}
						className="rounded bg-[#1A1A1A] px-5 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-50"
					>
						{saving ? t("admin.storageSaving") : t("admin.storageSave")}
					</button>
				</div>
			</form>
		</div>
	);
}
