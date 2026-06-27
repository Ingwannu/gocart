"use client";
import Loading from "@/components/Loading";
import { uploadFiles } from "@/lib/client-upload";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const emptyProfile = {
	name: "",
	description: "",
	email: "",
	contact: "",
	address: "",
	logo: "",
};

function storeToProfile(store) {
	return {
		name: store?.name || "",
		description: store?.description || "",
		email: store?.email || "",
		contact: store?.contact || "",
		address: store?.address || "",
		logo: store?.logo || "",
	};
}

export default function StoreProfilePage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [store, setStore] = useState(null);
	const [profile, setProfile] = useState(emptyProfile);

	useEffect(() => {
		fetchJson("/api/stores/me")
			.then((data) => {
				setStore(data.store || null);
				setProfile(storeToProfile(data.store));
			})
			.catch(() => {
				setStore(null);
				setProfile(emptyProfile);
			})
			.finally(() => setLoading(false));
	}, []);

	const updateProfile = (field, value) => {
		setProfile((prev) => ({ ...prev, [field]: value }));
	};

	const uploadLogo = async (file) => {
		if (!file) return;
		const [upload] = await uploadFiles([file]);
		updateProfile("logo", upload.url);
	};

	const saveProfile = async (event) => {
		event.preventDefault();
		setSaving(true);
		try {
			const data = await fetchJson("/api/stores/me", {
				method: "PATCH",
				body: JSON.stringify(profile),
			});
			setStore(data.store);
			setProfile(storeToProfile(data.store));
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <Loading />;
	if (store?.permissions?.canEditProfile === false) {
		return (
			<div className="text-slate-500 mb-28">
				<h1 className="text-2xl">
					{t("store.profile")}{" "}
					<span className="text-slate-800 font-medium">
						{t("store.storeInfo")}
					</span>
				</h1>
				<div className="mt-5 max-w-3xl rounded-lg border border-slate-200 bg-white p-8 text-center">
					<p className="text-lg font-medium text-slate-700">
						{t("store.notAuthorized")}
					</p>
					{store?.username && (
						<Link
							href={`/shop/${store.username}`}
							className="mt-4 inline-flex rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
						>
							{t("store.viewPublicStore")}
						</Link>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="text-slate-500 mb-28">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-2xl">
					{t("store.profile")}{" "}
					<span className="text-slate-800 font-medium">{t("store.storeInfo")}</span>
				</h1>
				{store?.username && (
					<Link
						href={`/shop/${store.username}`}
						className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
					>
						{t("store.viewPublicStore")}
					</Link>
				)}
			</div>
			<form
				onSubmit={(event) =>
					toast.promise(saveProfile(event), {
						loading: t("store.savingProfile"),
					})
				}
				className="mt-5 max-w-3xl rounded-lg border border-slate-200 bg-white p-5"
			>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<Image
						src={profile.logo || "/favicon.ico"}
						alt=""
						width={96}
						height={96}
						className="size-24 rounded-md border border-slate-100 object-cover"
					/>
					<div className="flex-1">
						<label className="text-sm text-slate-600">
							{t("admin.logoUrl")}
							<input
								className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
								value={profile.logo}
								onChange={(event) => updateProfile("logo", event.target.value)}
								placeholder="/uploads/store-logo.png"
							/>
						</label>
						<label className="mt-2 inline-flex cursor-pointer rounded border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
							{t("admin.uploadLogo")}
							<input
								type="file"
								accept="image/*"
								className="hidden"
								onChange={(event) =>
									toast.promise(uploadLogo(event.target.files?.[0]), {
										loading: t("admin.uploadingLogo"),
									})
								}
							/>
						</label>
					</div>
				</div>
				<div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
					<label className="text-slate-600">
						{t("createStore.name")}
						<input
							className="mt-1 w-full rounded border border-slate-200 p-2"
							value={profile.name}
							onChange={(event) => updateProfile("name", event.target.value)}
							required
						/>
					</label>
					<label className="text-slate-600">
						{t("createStore.email")}
						<input
							type="email"
							className="mt-1 w-full rounded border border-slate-200 p-2"
							value={profile.email}
							onChange={(event) => updateProfile("email", event.target.value)}
							required
						/>
					</label>
					<label className="text-slate-600">
						{t("createStore.contactNumber")}
						<input
							className="mt-1 w-full rounded border border-slate-200 p-2"
							value={profile.contact}
							onChange={(event) => updateProfile("contact", event.target.value)}
							required
						/>
					</label>
					<label className="text-slate-600">
						{t("createStore.addressField")}
						<input
							className="mt-1 w-full rounded border border-slate-200 p-2"
							value={profile.address}
							onChange={(event) => updateProfile("address", event.target.value)}
							required
						/>
					</label>
					<label className="text-slate-600 md:col-span-2">
						{t("createStore.description")}
						<textarea
							className="mt-1 min-h-28 w-full rounded border border-slate-200 p-2"
							value={profile.description}
							onChange={(event) =>
								updateProfile("description", event.target.value)
							}
						/>
					</label>
				</div>
				<button
					disabled={saving}
					className="mt-5 rounded bg-[#1A1A1A] px-5 py-2 text-sm text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{t("common.save")}
				</button>
			</form>
		</div>
	);
}
