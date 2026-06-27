"use client";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function ForgotPasswordPage() {
	const { t } = useTranslation();
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [resetUrl, setResetUrl] = useState("");

	const submitRequest = async (event) => {
		event.preventDefault();
		const data = await fetchJson("/api/auth/password-reset/request", {
			method: "POST",
			body: JSON.stringify({ email }),
		});
		setSubmitted(true);
		setResetUrl(data.resetUrl || "");
	};

	return (
		<div className="min-h-[80vh] flex items-center justify-center bg-white">
			<div className="w-full max-w-md mx-auto px-6">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-semibold text-slate-700">
						{t("passwordReset.forgotTitle")}
					</h1>
					<p className="text-slate-500 mt-3 text-sm">
						{t("passwordReset.forgotSubtitle")}
					</p>
				</div>
				<form
					onSubmit={(event) =>
						toast.promise(submitRequest(event), {
							loading: t("passwordReset.sending"),
						})
					}
					className="space-y-4"
				>
					<label className="block text-sm text-slate-600">
						{t("loginPage.emailLabel")}
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="w-full p-3 mt-1 border border-slate-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
							required
						/>
					</label>
					<button className="w-full bg-[#1A1A1A] text-white py-3 rounded-lg hover:bg-orange-600 active:scale-[0.98] transition font-medium">
						{t("passwordReset.sendLink")}
					</button>
				</form>
				{submitted && (
					<div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
						<p>{t("passwordReset.requestSubmitted")}</p>
						{resetUrl && (
							<Link className="mt-3 block break-all text-orange-600" href={resetUrl}>
								{resetUrl}
							</Link>
						)}
					</div>
				)}
				<p className="mt-5 text-center text-sm text-slate-500">
					<Link href="/login" className="text-orange-600">
						{t("common.login")}
					</Link>
				</p>
			</div>
		</div>
	);
}
