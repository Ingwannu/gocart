"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function ResetPasswordPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [token, setToken] = useState("");
	const [password, setPassword] = useState("");

	useEffect(() => {
		setToken(new URLSearchParams(window.location.search).get("token") || "");
	}, []);

	const submitReset = async (event) => {
		event.preventDefault();
		await fetchJson("/api/auth/password-reset/confirm", {
			method: "POST",
			body: JSON.stringify({ token, password }),
		});
		router.push("/login");
	};

	return (
		<div className="min-h-[80vh] flex items-center justify-center bg-white">
			<div className="w-full max-w-md mx-auto px-6">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-semibold text-slate-700">
						{t("passwordReset.resetTitle")}
					</h1>
					<p className="text-slate-500 mt-3 text-sm">
						{t("passwordReset.resetSubtitle")}
					</p>
				</div>
				<form
					onSubmit={(event) =>
						toast.promise(submitReset(event), {
							loading: t("passwordReset.updating"),
						})
					}
					className="space-y-4"
				>
					<label className="block text-sm text-slate-600">
						{t("passwordReset.newPassword")}
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="w-full p-3 mt-1 border border-slate-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
							required
						/>
					</label>
					<button
						disabled={!token}
						className="w-full bg-[#1A1A1A] text-white py-3 rounded-lg hover:bg-orange-600 active:scale-[0.98] transition font-medium disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t("passwordReset.updatePassword")}
					</button>
				</form>
				{!token && (
					<p className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
						{t("passwordReset.missingToken")}
					</p>
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
