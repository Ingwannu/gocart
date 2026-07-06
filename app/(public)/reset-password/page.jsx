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
		<div className="min-h-[80vh] flex items-center justify-center bg-background">
			<div className="w-full max-w-md mx-auto px-6">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-semibold text-foreground">
						{t("passwordReset.resetTitle")}
					</h1>
					<p className="text-muted-foreground mt-3 text-sm">
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
					<label className="block text-sm text-muted-foreground">
						{t("passwordReset.newPassword")}
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="w-full p-3 mt-1 bg-frame border border-border rounded-lg outline-none focus:border-ring focus:ring-2 focus:ring-ring/25 transition"
							required
						/>
					</label>
					<button
						disabled={!token}
						className="w-full bg-accent text-accent-foreground py-3 rounded-lg hover:brightness-95 active:scale-[0.98] transition font-medium disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t("passwordReset.updatePassword")}
					</button>
				</form>
				{!token && (
					<p className="mt-4 rounded-lg bg-danger-soft p-3 text-center text-sm text-danger">
						{t("passwordReset.missingToken")}
					</p>
				)}
				<p className="mt-5 text-center text-sm text-muted-foreground">
					<Link href="/login" className="text-foreground font-medium underline">
						{t("common.login")}
					</Link>
				</p>
			</div>
		</div>
	);
}
