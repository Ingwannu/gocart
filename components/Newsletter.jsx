"use client";
import { useState } from "react";
import Title from "./Title";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";
import toast from "react-hot-toast";

const Newsletter = () => {
	const { t } = useTranslation();
	const [email, setEmail] = useState("");
	const [saving, setSaving] = useState(false);

	const subscribe = async (event) => {
		event.preventDefault();
		setSaving(true);
		try {
			await fetchJson("/api/newsletter", {
				method: "POST",
				body: JSON.stringify({ email }),
			});
			setEmail("");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex flex-col items-center mx-4 my-36">
			<Title
				title={t("sections.joinNewsletter")}
				description={t("descriptions.newsletterDesc")}
				visibleButton={false}
			/>
			<form
				onSubmit={(event) =>
					toast.promise(subscribe(event), {
						loading: t("descriptions.newsletterSaving"),
						success: t("descriptions.newsletterSaved"),
						error: (error) => error.message,
					})
				}
				className="flex w-full max-w-xl flex-col gap-2 rounded-lg border-2 border-white bg-[#F5F0E8] p-2 text-sm ring ring-orange-200 sm:flex-row sm:rounded-full sm:p-1"
			>
				<input
					className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none sm:pl-5"
					type="email"
					placeholder={t("descriptions.newsletterPlaceholder")}
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					required
				/>
				<button
					disabled={saving}
					className="rounded-md bg-orange-500 px-7 py-3 font-medium text-white transition hover:scale-103 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-full"
				>
					{t("descriptions.getUpdates")}
				</button>
			</form>
		</div>
	);
};

export default Newsletter;
