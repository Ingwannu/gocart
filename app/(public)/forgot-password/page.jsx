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
		<div className="min-h-[80vh] flex items-center justify-center bg-background">
			<div className="w-full max-w-md mx-auto px-6">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-semibold text-foreground">
						{t("passwordReset.forgotTitle")}
					</h1>
					<p className="text-muted-foreground mt-3 text-sm">
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
					<label className="block text-sm text-muted-foreground">
						{t("loginPage.emailLabel")}
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="w-full p-3 mt-1 bg-frame border border-border rounded-lg outline-none focus:border-ring focus:ring-2 focus:ring-ring/25 transition"
							required
						/>
					</label>
					<button className="w-full bg-accent text-accent-foreground py-3 rounded-lg hover:brightness-95 active:scale-[0.98] transition font-medium">
						{t("passwordReset.sendLink")}
					</button>
				</form>
				{submitted && (
					<div className="mt-5 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
						<p>{t("passwordReset.requestSubmitted")}</p>
						{resetUrl && (
							<Link className="mt-3 block break-all text-foreground underline" href={resetUrl}>
								{resetUrl}
							</Link>
						)}
					</div>
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
