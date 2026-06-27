"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const emptyCategory = {
	name: "",
	description: "",
	sortOrder: 0,
	isActive: true,
};

export default function AdminCategories() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [categories, setCategories] = useState([]);
	const [newCategory, setNewCategory] = useState(emptyCategory);
	const [editing, setEditing] = useState({});
	const [q, setQ] = useState("");
	const [active, setActive] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);

	const loadCategories = async (requestedPage = page) => {
		const params = new URLSearchParams();
		if (q.trim()) params.set("q", q.trim());
		if (active) params.set("active", active);
		params.set("page", String(requestedPage));

		const data = await fetchJson(`/api/product-categories?${params.toString()}`);
		setCategories(data.categories || []);
		setPagination(data.pagination || null);
		if (data.pagination?.page && data.pagination.page !== page) {
			setPage(data.pagination.page);
		}
		setEditing(
			(data.categories || []).reduce(
				(forms, category) => ({ ...forms, [category.id]: category }),
				{},
			),
		);
	};

	useEffect(() => {
		loadCategories()
			.catch(() => {
				setCategories([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [page, q, active]);

	const createCategory = async (event) => {
		event.preventDefault();
		await fetchJson("/api/product-categories", {
			method: "POST",
			body: JSON.stringify(newCategory),
		});
		setNewCategory(emptyCategory);
		if (page !== 1) {
			setPage(1);
		} else {
			await loadCategories(1);
		}
	};

	const saveCategory = async (categoryId) => {
		const data = await fetchJson(`/api/product-categories/${categoryId}`, {
			method: "PATCH",
			body: JSON.stringify(editing[categoryId]),
		});
		if (active) {
			await loadCategories();
		} else {
			setCategories((prev) =>
				prev.map((category) =>
					category.id === categoryId ? data.category : category,
				),
			);
		}
	};

	const deleteCategory = async (categoryId) => {
		if (!window.confirm(t("admin.deleteCategoryConfirm"))) return;
		await fetchJson(`/api/product-categories/${categoryId}`, { method: "DELETE" });
		await loadCategories();
	};

	if (loading) return <Loading />;

	return (
		<div className="text-slate-500 mb-28">
			<h1 className="text-2xl">
				{t("admin.categories")}{" "}
				<span className="text-slate-800 font-medium">
					{t("admin.management")}
				</span>
			</h1>
			<form
				onSubmit={(event) =>
					toast.promise(createCategory(event), {
						loading: t("admin.creatingCategory"),
					})
				}
				className="mt-5 max-w-5xl border border-slate-200 rounded-lg p-5 bg-white grid md:grid-cols-4 gap-3 text-sm"
			>
				<input
					className="p-2 border border-slate-200 rounded"
					placeholder={t("admin.categoryName")}
					value={newCategory.name}
					onChange={(event) =>
						setNewCategory((prev) => ({ ...prev, name: event.target.value }))
					}
					required
				/>
				<input
					className="p-2 border border-slate-200 rounded"
					placeholder={t("admin.description")}
					value={newCategory.description}
					onChange={(event) =>
						setNewCategory((prev) => ({
							...prev,
							description: event.target.value,
						}))
					}
				/>
				<input
					className="p-2 border border-slate-200 rounded"
					type="number"
					placeholder={t("admin.sortOrder")}
					value={newCategory.sortOrder}
					onChange={(event) =>
						setNewCategory((prev) => ({
							...prev,
							sortOrder: event.target.value,
						}))
					}
				/>
				<div className="flex gap-2 items-center">
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={newCategory.isActive}
							onChange={(event) =>
								setNewCategory((prev) => ({
									...prev,
									isActive: event.target.checked,
								}))
							}
						/>
						{t("admin.active")}
					</label>
					<button className="bg-[#1A1A1A] text-white px-4 py-2 rounded hover:bg-orange-600">
						{t("admin.createCategory")}
					</button>
				</div>
			</form>
			<div className="mt-5 max-w-5xl rounded-lg border border-slate-200 bg-white p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_170px_auto]">
					<input
						type="search"
						value={q}
						onChange={(event) => {
							setQ(event.target.value);
							setPage(1);
						}}
						placeholder={t("admin.searchCategories")}
						className="h-10 rounded border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-orange-400"
					/>
					<select
						value={active}
						onChange={(event) => {
							setActive(event.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-slate-200 px-3 text-sm text-slate-700"
					>
						<option value="">{t("admin.allActivity")}</option>
						<option value="true">{t("admin.active")}</option>
						<option value="false">{t("admin.inactive")}</option>
					</select>
					<button
						type="button"
						onClick={() => {
							setQ("");
							setActive("");
							setPage(1);
						}}
						className="h-10 rounded border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
				<p className="mt-3 text-xs text-slate-400">
					{t("admin.showingCategories", {
						count: pagination?.total ?? categories.length,
					})}
				</p>
			</div>
			<div className="overflow-x-auto mt-5 rounded-lg border border-slate-200 max-w-5xl">
				<table className="min-w-full bg-white text-sm">
					<thead className="bg-slate-50 text-slate-600">
						<tr>
							<th className="py-3 px-4 text-left">
								{t("admin.categoryName")}
							</th>
							<th className="py-3 px-4 text-left">Slug</th>
							<th className="py-3 px-4 text-left">
								{t("admin.description")}
							</th>
							<th className="py-3 px-4 text-left">
								{t("admin.sortOrder")}
							</th>
							<th className="py-3 px-4 text-left">{t("admin.active")}</th>
							<th className="py-3 px-4 text-left">{t("admin.action")}</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{categories.map((category) => (
							<tr key={category.id}>
								<td className="py-3 px-4">
									<input
										className="p-2 border border-slate-200 rounded"
										value={editing[category.id]?.name || ""}
										onChange={(event) =>
											setEditing((prev) => ({
												...prev,
												[category.id]: {
													...prev[category.id],
													name: event.target.value,
												},
											}))
										}
									/>
								</td>
								<td className="py-3 px-4 text-slate-700">{category.slug}</td>
								<td className="py-3 px-4">
									<input
										className="p-2 border border-slate-200 rounded w-full"
										value={editing[category.id]?.description || ""}
										onChange={(event) =>
											setEditing((prev) => ({
												...prev,
												[category.id]: {
													...prev[category.id],
													description: event.target.value,
												},
											}))
										}
									/>
								</td>
								<td className="py-3 px-4">
									<input
										className="p-2 border border-slate-200 rounded w-24"
										type="number"
										step="1"
										value={editing[category.id]?.sortOrder ?? 0}
										onChange={(event) =>
											setEditing((prev) => ({
												...prev,
												[category.id]: {
													...prev[category.id],
													sortOrder: event.target.value,
												},
											}))
										}
									/>
								</td>
								<td className="py-3 px-4">
									<input
										type="checkbox"
										checked={Boolean(editing[category.id]?.isActive)}
										onChange={(event) =>
											setEditing((prev) => ({
												...prev,
												[category.id]: {
													...prev[category.id],
													isActive: event.target.checked,
												},
											}))
										}
									/>
								</td>
								<td className="py-3 px-4">
									<div className="flex gap-3">
										<button
											onClick={() =>
												toast.promise(saveCategory(category.id), {
													loading: t("admin.updatingData"),
												})
											}
											className="px-3 py-2 bg-[#1A1A1A] text-white rounded"
										>
											{t("common.save")}
										</button>
										<button
											onClick={() =>
												toast.promise(deleteCategory(category.id), {
													loading: t("admin.deletingCategory"),
												})
											}
											className="text-red-500"
											title={t("common.delete")}
										>
											<TrashIcon size={18} />
										</button>
									</div>
								</td>
							</tr>
						))}
						{categories.length === 0 && (
							<tr>
								<td colSpan={6} className="py-8 px-4 text-center text-slate-400">
									{t("admin.noCategoriesFound")}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			{pagination && pagination.totalPages > 1 && (
				<div className="mt-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
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
							className="rounded border border-slate-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
						>
							{t("common.previous")}
						</button>
						<button
							type="button"
							disabled={!pagination.hasNextPage}
							onClick={() => setPage((prev) => prev + 1)}
							className="rounded border border-slate-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
						>
							{t("common.next")}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
