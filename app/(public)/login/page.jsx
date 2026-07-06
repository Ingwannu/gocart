"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import Link from "next/link";
import { normalizeInternalRedirect } from "@/lib/redirects.mjs";

export default function LoginPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		const result = await signIn("credentials", {
			email,
			password,
			redirect: false,
		});
		if (result?.error) {
			setError(t("loginPage.error"));
		} else {
			const callbackUrl = normalizeInternalRedirect(
				new URLSearchParams(window.location.search).get("callbackUrl"),
				"/",
			);
			router.push(callbackUrl);
			router.refresh();
		}
	};

	return (
		<div className="min-h-[80vh] flex items-center justify-center bg-background">
			<div className="w-full max-w-md mx-auto px-6">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-semibold text-foreground">
						<span className="text-foreground">wicked</span>{" "}
						<span className="text-success">shop</span>
						<span className="text-accent text-5xl leading-0">.</span>
					</h1>
					<p className="text-muted-foreground mt-3 text-sm">
						{t("loginPage.subtitle")}
					</p>
				</div>
				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="bg-danger-soft text-danger text-sm p-3 rounded-lg text-center">
							{error}
						</div>
					)}
					<div>
						<label className="block text-sm text-muted-foreground mb-1">
							{t("loginPage.emailLabel")}
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full p-3 bg-frame border border-border rounded-lg outline-none focus:border-ring focus:ring-2 focus:ring-ring/25 transition"
							placeholder="example@teamwicked.me"
							required
						/>
					</div>
					<div>
						<label className="block text-sm text-muted-foreground mb-1">
							{t("loginPage.passwordLabel")}
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full p-3 bg-frame border border-border rounded-lg outline-none focus:border-ring focus:ring-2 focus:ring-ring/25 transition"
							placeholder="••••••••"
							required
						/>
					</div>
					<button
						type="submit"
						className="w-full bg-accent text-accent-foreground py-3 rounded-lg hover:brightness-95 active:scale-[0.98] transition font-medium"
					>
						{t("loginPage.loginButton")}
					</button>
				</form>
				<p className="mt-4 text-center text-sm">
					<Link href="/forgot-password" className="text-foreground font-medium underline">
						{t("loginPage.forgotPassword")}
					</Link>
				</p>
				<p className="mt-5 text-center text-sm text-muted-foreground">
					{t("loginPage.noAccount")}{" "}
					<Link href="/signup" className="text-foreground font-medium underline">
						{t("signupPage.signupButton")}
					</Link>
				</p>
			</div>
		</div>
	);
}
