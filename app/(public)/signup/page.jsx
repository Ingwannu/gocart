"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";

export default function SignupPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [form, setForm] = useState({
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
	});

	const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

	const submitSignup = async (event) => {
		event.preventDefault();
		await fetchJson("/api/auth/register", {
			method: "POST",
			body: JSON.stringify(form),
		});
		const result = await signIn("credentials", {
			email: form.email,
			password: form.password,
			redirect: false,
		});
		if (result?.error) throw new Error(t("loginPage.error"));
		router.push("/");
		router.refresh();
	};

	return (
		<div className="min-h-[80vh] flex items-center justify-center bg-white">
			<div className="w-full max-w-md mx-auto px-6">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-semibold text-slate-700">
						<span className="text-orange-500">wicked</span>{" "}
						<span className="text-green-600">shop</span>
						<span className="text-orange-500 text-5xl leading-0">.</span>
					</h1>
					<p className="text-slate-500 mt-3 text-sm">{t("signupPage.subtitle")}</p>
				</div>
				<form
					onSubmit={(event) =>
						toast.promise(submitSignup(event), {
							loading: t("signupPage.creatingAccount"),
						})
					}
					className="space-y-4"
				>
					<label className="block text-sm text-slate-600">
						{t("signupPage.nameLabel")}
						<input
							value={form.name}
							onChange={(event) => updateForm("name", event.target.value)}
							className="w-full p-3 mt-1 border border-slate-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
							required
						/>
					</label>
					<label className="block text-sm text-slate-600">
						{t("loginPage.emailLabel")}
						<input
							type="email"
							value={form.email}
							onChange={(event) => updateForm("email", event.target.value)}
							className="w-full p-3 mt-1 border border-slate-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
							required
						/>
					</label>
						<label className="block text-sm text-slate-600">
							{t("loginPage.passwordLabel")}
							<input
								type="password"
							value={form.password}
							onChange={(event) => updateForm("password", event.target.value)}
							className="w-full p-3 mt-1 border border-slate-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
								required
							/>
						</label>
						<label className="block text-sm text-slate-600">
							{t("signupPage.confirmPasswordLabel")}
							<input
								type="password"
								value={form.confirmPassword}
								onChange={(event) =>
									updateForm("confirmPassword", event.target.value)
								}
								className="w-full p-3 mt-1 border border-slate-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
								required
							/>
						</label>
						<button className="w-full bg-[#1A1A1A] text-white py-3 rounded-lg hover:bg-orange-600 active:scale-[0.98] transition font-medium">
						{t("signupPage.signupButton")}
					</button>
				</form>
				<p className="mt-5 text-center text-sm text-slate-500">
					{t("signupPage.hasAccount")}{" "}
					<Link href="/login" className="text-orange-600">
						{t("common.login")}
					</Link>
				</p>
			</div>
		</div>
	);
}
