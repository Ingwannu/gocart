"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const emptyProfile = { name: "", email: "", image: "" };
const emptyPassword = { currentPassword: "", newPassword: "" };

function userToProfile(user) {
	return {
		name: user?.name || "",
		email: user?.email || "",
		image: user?.image || "",
	};
}

export default function AccountPage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [savingProfile, setSavingProfile] = useState(false);
	const [savingPassword, setSavingPassword] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [profile, setProfile] = useState(emptyProfile);
	const [password, setPassword] = useState(emptyPassword);
	const [authorized, setAuthorized] = useState(true);

	useEffect(() => {
		fetchJson("/api/account")
			.then((data) => {
				setProfile(userToProfile(data.user));
				setAuthorized(true);
			})
			.catch(() => {
				setAuthorized(false);
			})
			.finally(() => setLoading(false));
	}, []);

	const updateProfile = (field, value) => {
		setProfile((prev) => ({ ...prev, [field]: value }));
	};

	const updatePassword = (field, value) => {
		setPassword((prev) => ({ ...prev, [field]: value }));
	};

	const saveProfile = async (event) => {
		event.preventDefault();
		setSavingProfile(true);
		try {
			const data = await fetchJson("/api/account", {
				method: "PATCH",
				body: JSON.stringify(profile),
			});
			setProfile(userToProfile(data.user));
		} finally {
			setSavingProfile(false);
		}
	};

	const savePassword = async (event) => {
		event.preventDefault();
		setSavingPassword(true);
		try {
			await fetchJson("/api/account", {
				method: "PATCH",
				body: JSON.stringify(password),
			});
			setPassword(emptyPassword);
		} finally {
			setSavingPassword(false);
		}
	};

	const downloadAccountExport = async () => {
		setExporting(true);
		try {
			const data = await fetchJson("/api/account/export");
			const blob = new Blob([JSON.stringify(data.export, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = `wickedshop-account-${Date.now()}.json`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
		} finally {
			setExporting(false);
		}
	};

	if (loading) return <Loading />;

	if (!authorized) {
		return (
			<div className="mx-6 flex min-h-[60vh] items-center justify-center text-center text-muted-foreground">
				<div>
					<h1 className="text-2xl font-medium text-foreground">
						{t("account.loginRequired")}
					</h1>
					<Link
						href="/login?callbackUrl=/account"
						className="mt-5 inline-flex rounded bg-accent px-6 py-2 text-accent-foreground hover:brightness-95"
					>
						{t("common.login")}
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-6 min-h-[70vh] text-muted-foreground">
			<div className="mx-auto my-16 max-w-4xl">
				<h1 className="text-3xl font-medium text-foreground">
					{t("account.title")}
				</h1>
				<p className="mt-2 text-sm">{t("account.subtitle")}</p>

				<div className="mt-8 rounded-lg border border-border bg-frame p-5">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-lg font-medium text-foreground">
								{t("account.dataExportSection")}
							</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								{t("account.dataExportDesc")}
							</p>
						</div>
						<button
							type="button"
							disabled={exporting}
							onClick={() =>
								toast.promise(downloadAccountExport(), {
									loading: t("account.exportingData"),
									success: t("account.dataExportReady"),
									error: (error) => error.message,
								})
							}
							className="rounded bg-accent px-5 py-2 text-sm text-accent-foreground hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{t("account.downloadData")}
						</button>
					</div>
				</div>

				<div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
					<form
						onSubmit={(event) =>
							toast.promise(saveProfile(event), {
								loading: t("account.savingProfile"),
								success: t("account.profileSaved"),
								error: (error) => error.message,
							})
						}
						className="rounded-lg border border-border bg-frame p-5"
					>
						<h2 className="text-lg font-medium text-foreground">
							{t("account.profileSection")}
						</h2>
						<div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
							<Image
								src={profile.image || "/favicon.ico"}
								alt=""
								width={80}
								height={80}
								className="size-20 rounded-full border border-border object-cover"
							/>
							<label className="flex-1 text-sm">
								{t("account.imageUrl")}
								<input
									className="mt-1 w-full rounded border border-border bg-frame p-2 text-sm"
									value={profile.image}
									onChange={(event) => updateProfile("image", event.target.value)}
									placeholder="/uploads/avatar.png"
								/>
							</label>
						</div>
						<div className="mt-5 grid gap-4 sm:grid-cols-2">
							<label className="text-sm">
								{t("signupPage.nameLabel")}
								<input
									className="mt-1 w-full rounded border border-border bg-frame p-2"
									value={profile.name}
									onChange={(event) => updateProfile("name", event.target.value)}
									required
								/>
							</label>
							<label className="text-sm">
								{t("loginPage.emailLabel")}
								<input
									type="email"
									className="mt-1 w-full rounded border border-border bg-frame p-2"
									value={profile.email}
									onChange={(event) => updateProfile("email", event.target.value)}
									required
								/>
							</label>
						</div>
						<button
							disabled={savingProfile}
							className="mt-5 rounded bg-accent px-5 py-2 text-sm text-accent-foreground hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{t("common.save")}
						</button>
					</form>

					<form
						onSubmit={(event) =>
							toast.promise(savePassword(event), {
								loading: t("account.savingPassword"),
								success: t("account.passwordSaved"),
								error: (error) => error.message,
							})
						}
						className="rounded-lg border border-border bg-frame p-5"
					>
						<h2 className="text-lg font-medium text-foreground">
							{t("account.passwordSection")}
						</h2>
						<div className="mt-5 space-y-4">
							<label className="block text-sm">
								{t("account.currentPassword")}
								<input
									type="password"
									className="mt-1 w-full rounded border border-border bg-frame p-2"
									value={password.currentPassword}
									onChange={(event) =>
										updatePassword("currentPassword", event.target.value)
									}
									required
								/>
							</label>
							<label className="block text-sm">
								{t("passwordReset.newPassword")}
								<input
									type="password"
									className="mt-1 w-full rounded border border-border bg-frame p-2"
									value={password.newPassword}
									onChange={(event) =>
										updatePassword("newPassword", event.target.value)
									}
									required
									minLength={8}
								/>
							</label>
						</div>
						<button
							disabled={savingPassword}
							className="mt-5 rounded bg-accent px-5 py-2 text-sm text-accent-foreground hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{t("passwordReset.updatePassword")}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
