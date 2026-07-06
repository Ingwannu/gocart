"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { CheckIcon, DeleteIcon, SquarePenIcon, XIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";

export default function AdminCoupons() {
	const { t } = useTranslation();
	const [coupons, setCoupons] = useState([]);
	const [q, setQ] = useState("");
	const [audience, setAudience] = useState("");
	const [expiry, setExpiry] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);
	const [editingCoupon, setEditingCoupon] = useState(null);
	const [couponDraft, setCouponDraft] = useState({});
	const [newCoupon, setNewCoupon] = useState({
		code: "",
		description: "",
		discount: "",
		forNewUser: false,
		forMember: false,
		isPublic: false,
		expiresAt: new Date(),
	});

	const fetchCoupons = async (requestedPage = page) => {
		const params = new URLSearchParams();
		if (q.trim()) params.set("q", q.trim());
		if (audience) params.set("audience", audience);
		if (expiry) params.set("expiry", expiry);
		params.set("page", String(requestedPage));

		const data = await fetchJson(
			`/api/coupons${params.size ? `?${params.toString()}` : ""}`,
		);
		setCoupons(data.coupons || []);
		setPagination(data.pagination || null);
		if (data.pagination?.page && data.pagination.page !== page) {
			setPage(data.pagination.page);
		}
	};
	const handleAddCoupon = async (e) => {
		e.preventDefault();
		await fetchJson("/api/coupons", {
			method: "POST",
			body: JSON.stringify(newCoupon),
		});
		setNewCoupon({
			code: "",
			description: "",
			discount: "",
			forNewUser: false,
			forMember: false,
			isPublic: false,
			expiresAt: new Date(),
		});
		if (page !== 1) {
			setPage(1);
		} else {
			await fetchCoupons(1);
		}
	};
	const handleChange = (e) => {
		setNewCoupon({ ...newCoupon, [e.target.name]: e.target.value });
	};
	const createCouponDraft = (coupon) => ({
		description: coupon.description || "",
		discount: String(coupon.discount || ""),
		expiresAt: format(new Date(coupon.expiresAt), "yyyy-MM-dd"),
		forNewUser: Boolean(coupon.forNewUser),
		forMember: Boolean(coupon.forMember),
		isPublic: Boolean(coupon.isPublic),
	});
	const handleEditCoupon = (coupon) => {
		setEditingCoupon(coupon.code);
		setCouponDraft(createCouponDraft(coupon));
	};
	const handleSaveCoupon = async (code) => {
		await fetchJson(`/api/coupons/${code}`, {
			method: "PATCH",
			body: JSON.stringify(couponDraft),
		});
		setEditingCoupon(null);
		setCouponDraft({});
		await fetchCoupons();
	};
	const deleteCoupon = async (code) => {
		if (!window.confirm(t("admin.deleteCouponConfirm"))) return;
		await fetchJson(`/api/coupons/${code}`, { method: "DELETE" });
		await fetchCoupons();
	};

	useEffect(() => {
		fetchCoupons();
	}, [page, q, audience, expiry]);

	return (
		<div className="text-muted-foreground mb-40">
			<form
				onSubmit={(e) =>
					toast.promise(handleAddCoupon(e), {
						loading: t("admin.addingCoupon"),
					})
				}
				className="max-w-sm text-sm"
			>
				<h2 className="text-2xl">
					{t("admin.addCoupons")}{" "}
					<span className="text-foreground font-medium"></span>
				</h2>
				<div className="flex gap-2 max-sm:flex-col mt-2">
					<input
						type="text"
						placeholder={t("admin.couponCode")}
						className="w-full mt-2 p-2 border border-border outline-ring rounded-md"
						name="code"
						value={newCoupon.code}
						onChange={handleChange}
						required
					/>
					<input
						type="number"
						placeholder={t("admin.couponDiscount")}
						min={1}
						max={100}
						className="w-full mt-2 p-2 border border-border outline-ring rounded-md"
						name="discount"
						value={newCoupon.discount}
						onChange={handleChange}
						required
					/>
				</div>
				<input
					type="text"
					placeholder={t("admin.couponDescription")}
					className="w-full mt-2 p-2 border border-border outline-ring rounded-md"
					name="description"
					value={newCoupon.description}
					onChange={handleChange}
					required
				/>
				<label>
					<p className="mt-3">{t("admin.couponExpiry")}</p>
					<input
						type="date"
						className="w-full mt-1 p-2 border border-border outline-ring rounded-md"
						name="expiresAt"
						value={format(new Date(newCoupon.expiresAt), "yyyy-MM-dd")}
						onChange={handleChange}
					/>
				</label>
				<div className="mt-5">
					<div className="flex gap-2 mt-3">
						<label className="relative inline-flex items-center cursor-pointer text-foreground gap-3">
							<input
								type="checkbox"
								className="sr-only peer"
								name="forNewUser"
								checked={newCoupon.forNewUser}
								onChange={(e) =>
									setNewCoupon({ ...newCoupon, forNewUser: e.target.checked })
								}
							/>
							<div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-success transition-colors duration-200"></div>
							<span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
						</label>
						<p>{t("admin.forNewUser")}</p>
					</div>
					<div className="flex gap-2 mt-3">
						<label className="relative inline-flex items-center cursor-pointer text-foreground gap-3">
							<input
								type="checkbox"
								className="sr-only peer"
								name="forMember"
								checked={newCoupon.forMember}
								onChange={(e) =>
									setNewCoupon({ ...newCoupon, forMember: e.target.checked })
								}
							/>
							<div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-success transition-colors duration-200"></div>
							<span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
						</label>
						<p>{t("admin.forMember")}</p>
					</div>
					<div className="flex gap-2 mt-3">
						<label className="relative inline-flex items-center cursor-pointer text-foreground gap-3">
							<input
								type="checkbox"
								className="sr-only peer"
								name="isPublic"
								checked={newCoupon.isPublic}
								onChange={(e) =>
									setNewCoupon({ ...newCoupon, isPublic: e.target.checked })
								}
							/>
							<div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-success transition-colors duration-200"></div>
							<span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
						</label>
						<p>{t("admin.publicCoupon")}</p>
					</div>
				</div>
				<button className="mt-4 p-2 px-10 rounded bg-accent text-accent-foreground active:scale-95 transition">
					{t("admin.addCoupon")}
				</button>
			</form>
			<div className="mt-14">
				<h2 className="text-2xl">{t("admin.listCoupons")}</h2>
				<div className="mt-4 max-w-4xl rounded-lg border border-border bg-frame p-4">
					<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_160px_auto]">
						<input
							type="search"
							value={q}
							onChange={(e) => {
								setQ(e.target.value);
								setPage(1);
							}}
							placeholder={t("admin.searchCoupons")}
							className="h-10 rounded border border-border px-3 text-sm text-foreground outline-none focus:border-ring"
						/>
						<select
							value={audience}
							onChange={(e) => {
								setAudience(e.target.value);
								setPage(1);
							}}
							className="h-10 rounded border border-border px-3 text-sm text-foreground"
						>
							<option value="">{t("admin.allAudiences")}</option>
							<option value="public">{t("admin.publicCoupon")}</option>
							<option value="new">{t("admin.forNewUser")}</option>
							<option value="member">{t("admin.forMember")}</option>
						</select>
						<select
							value={expiry}
							onChange={(e) => {
								setExpiry(e.target.value);
								setPage(1);
							}}
							className="h-10 rounded border border-border px-3 text-sm text-foreground"
						>
							<option value="">{t("admin.allExpiry")}</option>
							<option value="active">{t("admin.activeCoupons")}</option>
							<option value="expired">{t("admin.expiredCoupons")}</option>
						</select>
						<button
							type="button"
							onClick={() => {
								setQ("");
								setAudience("");
								setExpiry("");
								setPage(1);
							}}
							className="h-10 rounded border border-border px-4 text-sm text-foreground hover:bg-muted"
						>
							{t("ordersPage.reset")}
						</button>
					</div>
					<p className="mt-3 text-xs text-muted-foreground">
						{t("admin.showingCoupons", {
							count: pagination?.total ?? coupons.length,
						})}
					</p>
				</div>
				<div className="overflow-x-auto mt-4 rounded-lg border border-border max-w-4xl">
					<table className="min-w-full bg-frame text-sm">
						<thead className="bg-muted">
							<tr>
								<th className="py-3 px-4 text-left font-semibold text-muted-foreground">
									{t("admin.code")}
								</th>
								<th className="py-3 px-4 text-left font-semibold text-muted-foreground">
									{t("admin.description")}
								</th>
								<th className="py-3 px-4 text-left font-semibold text-muted-foreground">
									{t("admin.discount")}
								</th>
								<th className="py-3 px-4 text-left font-semibold text-muted-foreground">
									{t("admin.expiresAt")}
								</th>
								<th className="py-3 px-4 text-left font-semibold text-muted-foreground">
									{t("admin.newUser")}
								</th>
								<th className="py-3 px-4 text-left font-semibold text-muted-foreground">
									{t("admin.forMemberCol")}
								</th>
								<th className="py-3 px-4 text-left font-semibold text-muted-foreground">
									{t("admin.publicCoupon")}
								</th>
								<th className="py-3 px-4 text-left font-semibold text-muted-foreground">
									{t("admin.action")}
								</th>
							</tr>
						</thead>
							<tbody className="divide-y divide-border">
								{coupons.map((coupon) => {
									const isEditing = editingCoupon === coupon.code;
									return (
										<tr key={coupon.code} className="hover:bg-muted">
											<td className="py-3 px-4 font-medium text-foreground">
												{coupon.code}
											</td>
											<td className="py-3 px-4 text-foreground">
												{isEditing ? (
													<input
														type="text"
														value={couponDraft.description || ""}
														onChange={(e) =>
															setCouponDraft((draft) => ({
																...draft,
																description: e.target.value,
															}))
														}
														className="w-48 rounded border border-border px-2 py-1 text-sm outline-none focus:border-ring"
													/>
												) : (
													coupon.description
												)}
											</td>
											<td className="py-3 px-4 text-foreground">
												{isEditing ? (
													<input
														type="number"
														min={1}
														max={100}
														value={couponDraft.discount || ""}
														onChange={(e) =>
															setCouponDraft((draft) => ({
																...draft,
																discount: e.target.value,
															}))
														}
														className="w-20 rounded border border-border px-2 py-1 text-sm outline-none focus:border-ring"
													/>
												) : (
													`${coupon.discount}%`
												)}
											</td>
											<td className="py-3 px-4 text-foreground">
												{isEditing ? (
													<input
														type="date"
														value={couponDraft.expiresAt || ""}
														onChange={(e) =>
															setCouponDraft((draft) => ({
																...draft,
																expiresAt: e.target.value,
															}))
														}
														className="w-36 rounded border border-border px-2 py-1 text-sm outline-none focus:border-ring"
													/>
												) : (
													format(new Date(coupon.expiresAt), "yyyy-MM-dd")
												)}
											</td>
											<td className="py-3 px-4 text-foreground">
												{isEditing ? (
													<input
														type="checkbox"
														checked={Boolean(couponDraft.forNewUser)}
														onChange={(e) =>
															setCouponDraft((draft) => ({
																...draft,
																forNewUser: e.target.checked,
															}))
														}
													/>
												) : coupon.forNewUser ? (
													t("common.yes")
												) : (
													t("common.no")
												)}
											</td>
											<td className="py-3 px-4 text-foreground">
												{isEditing ? (
													<input
														type="checkbox"
														checked={Boolean(couponDraft.forMember)}
														onChange={(e) =>
															setCouponDraft((draft) => ({
																...draft,
																forMember: e.target.checked,
															}))
														}
													/>
												) : coupon.forMember ? (
													t("common.yes")
												) : (
													t("common.no")
												)}
											</td>
											<td className="py-3 px-4 text-foreground">
												{isEditing ? (
													<input
														type="checkbox"
														checked={Boolean(couponDraft.isPublic)}
														onChange={(e) =>
															setCouponDraft((draft) => ({
																...draft,
																isPublic: e.target.checked,
															}))
														}
													/>
												) : coupon.isPublic ? (
													t("common.yes")
												) : (
													t("common.no")
												)}
											</td>
											<td className="py-3 px-4 text-foreground">
												<div className="flex items-center gap-2">
													{isEditing ? (
														<>
															<CheckIcon
																title={t("common.save")}
																onClick={() =>
																	toast.promise(handleSaveCoupon(coupon.code), {
																		loading: t("admin.savingCoupon"),
																	})
																}
																className="w-5 h-5 text-success hover:brightness-110 cursor-pointer"
															/>
															<XIcon
																title={t("common.close")}
																onClick={() => {
																	setEditingCoupon(null);
																	setCouponDraft({});
																}}
																className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer"
															/>
														</>
													) : (
														<>
															<SquarePenIcon
																title={t("admin.editCoupon")}
																onClick={() => handleEditCoupon(coupon)}
																className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer"
															/>
															<DeleteIcon
																title={t("common.delete")}
																onClick={() =>
																	toast.promise(deleteCoupon(coupon.code), {
																		loading: t("admin.deletingCoupon"),
																	})
																}
																className="w-5 h-5 text-danger hover:brightness-110 cursor-pointer"
															/>
														</>
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
					</table>
				</div>
				{pagination && pagination.totalPages > 1 && (
					<div className="mt-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
						<span>
							{t("common.pageSummary", {
								page: pagination.page,
								totalPages: pagination.totalPages,
								total: pagination.total,
							})}
						</span>
						<div className="flex gap-2">
							<button
								type="button"
								disabled={!pagination.hasPreviousPage}
								onClick={() => setPage((prev) => Math.max(1, prev - 1))}
								className="rounded border border-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
							>
								{t("common.previous")}
							</button>
							<button
								type="button"
								disabled={!pagination.hasNextPage}
								onClick={() => setPage((prev) => prev + 1)}
								className="rounded border border-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
							>
								{t("common.next")}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
