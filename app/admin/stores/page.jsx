"use client";
import StoreInfo from "@/components/admin/StoreInfo";
import Loading from "@/components/Loading";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";
import { uploadFiles } from "@/lib/client-upload";
import { TrashIcon } from "lucide-react";

const emptyStoreForm = {
	userEmail: "",
	username: "",
	name: "",
	description: "",
	email: "",
	contact: "",
	address: "",
	logo: "",
	status: "approved",
	isActive: true,
};

const emptyStaffForm = {
	userEmail: "",
	role: "staff",
	isActive: true,
};

const storeStatusOptions = [
	{ value: "approved", labelKey: "admin.storeStatusApproved" },
	{ value: "pending", labelKey: "admin.storeStatusPending" },
	{ value: "rejected", labelKey: "admin.storeStatusRejected" },
];

function storeToForm(store) {
	return {
		userEmail: store.user?.email || "",
		username: store.username || "",
		name: store.name || "",
		description: store.description || "",
		email: store.email || "",
		contact: store.contact || "",
		address: store.address || "",
		logo: store.logo || "",
		status: store.status || "approved",
		isActive: Boolean(store.isActive),
	};
}

export default function AdminStores() {
	const { t } = useTranslation();
	const [stores, setStores] = useState([]);
	const [loading, setLoading] = useState(true);
	const [newStore, setNewStore] = useState(emptyStoreForm);
	const [staffForms, setStaffForms] = useState({});
	const [editingStores, setEditingStores] = useState({});
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [activeFilter, setActiveFilter] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);

	const loadStores = async (requestedPage = page) => {
		const params = new URLSearchParams();
		if (query.trim()) params.set("q", query.trim());
		if (statusFilter) params.set("status", statusFilter);
		if (activeFilter) params.set("active", activeFilter);
		params.set("page", String(requestedPage));
		const data = await fetchJson(`/api/stores?${params.toString()}`);
		setStores(data.stores || []);
		setPagination(data.pagination || null);
		if (data.pagination?.page && data.pagination.page !== page) {
			setPage(data.pagination.page);
		}
		setEditingStores(
			(data.stores || []).reduce((forms, store) => {
				forms[store.id] = storeToForm(store);
				return forms;
			}, {}),
		);
		setStaffForms(
			(data.stores || []).reduce((forms, store) => {
				forms[store.id] = { ...emptyStaffForm };
				return forms;
			}, {}),
		);
	};

	useEffect(() => {
		loadStores()
			.catch(() => {
				setStores([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [activeFilter, page, query, statusFilter]);

	const updateNewStore = (field, value) => {
		setNewStore((prev) => ({ ...prev, [field]: value }));
	};

	const updateEditingStore = (storeId, field, value) => {
		setEditingStores((prev) => ({
			...prev,
			[storeId]: {
				...(prev[storeId] || {}),
				[field]: value,
			},
		}));
	};
	const updateStaffForm = (storeId, field, value) => {
		setStaffForms((prev) => ({
			...prev,
			[storeId]: {
				...(prev[storeId] || emptyStaffForm),
				[field]: value,
			},
		}));
	};

	const createStore = async (event) => {
		event.preventDefault();
		const data = await fetchJson("/api/stores", {
			method: "POST",
			body: JSON.stringify(newStore),
		});
		setStores((prev) => [data.store, ...prev]);
		setEditingStores((prev) => ({
			...prev,
			[data.store.id]: storeToForm(data.store),
		}));
		setNewStore(emptyStoreForm);
		if (page !== 1) {
			setPage(1);
		} else {
			await loadStores(1);
		}
	};

	const saveStore = async (storeId) => {
		const data = await fetchJson(`/api/stores/${storeId}`, {
			method: "PATCH",
			body: JSON.stringify(editingStores[storeId]),
		});
		setStores((prev) =>
			prev.map((store) => (store.id === storeId ? data.store : store)),
		);
		setEditingStores((prev) => ({
			...prev,
			[storeId]: storeToForm(data.store),
		}));
	};
	const deleteStore = async (storeId) => {
		if (!window.confirm(t("admin.deleteStoreConfirm"))) return;
		const data = await fetchJson(`/api/stores/${storeId}`, { method: "DELETE" });
		if (data.archived && data.store) {
			setStores((prev) =>
				prev.map((store) => (store.id === storeId ? data.store : store)),
			);
			setEditingStores((prev) => ({
				...prev,
				[storeId]: storeToForm(data.store),
			}));
			await loadStores();
			return;
		}
		await loadStores();
	};
	const grantStaff = async (storeId) => {
		const data = await fetchJson(`/api/stores/${storeId}/staff`, {
			method: "POST",
			body: JSON.stringify(staffForms[storeId] || emptyStaffForm),
		});
		setStores((prev) =>
			prev.map((store) =>
				store.id === storeId
					? {
							...store,
							staffMembers: [...(store.staffMembers || []), data.staff],
						}
					: store,
			),
		);
		setStaffForms((prev) => ({
			...prev,
			[storeId]: { ...emptyStaffForm },
		}));
	};
	const updateStaff = async (storeId, staffId, payload) => {
		const data = await fetchJson(`/api/stores/${storeId}/staff/${staffId}`, {
			method: "PATCH",
			body: JSON.stringify(payload),
		});
		setStores((prev) =>
			prev.map((store) =>
				store.id === storeId
					? {
							...store,
							staffMembers: (store.staffMembers || []).map((staff) =>
								staff.id === staffId ? data.staff : staff,
							),
						}
					: store,
			),
		);
	};
	const revokeStaff = async (storeId, staffId) => {
		if (!window.confirm(t("admin.revokeStaffConfirm"))) return;
		const data = await fetchJson(`/api/stores/${storeId}/staff/${staffId}`, {
			method: "DELETE",
		});
		setStores((prev) =>
			prev.map((store) =>
				store.id === storeId
					? {
							...store,
							staffMembers: (store.staffMembers || []).filter(
								(staff) => staff.id !== data.staffId,
							),
						}
					: store,
			),
		);
	};
	const uploadNewStoreLogo = async (file) => {
		if (!file) return;
		const [upload] = await uploadFiles([file]);
		updateNewStore("logo", upload.url);
	};
	const uploadEditingStoreLogo = async (storeId, file) => {
		if (!file) return;
		const [upload] = await uploadFiles([file]);
		updateEditingStore(storeId, "logo", upload.url);
	};

	return !loading ? (
		<div className="text-slate-500 mb-28">
			<h1 className="text-2xl">
				{t("admin.manageStores")}{" "}
				<span className="text-slate-800 font-medium">{t("admin.stores")}</span>
			</h1>
			<div className="mt-5 max-w-5xl grid md:grid-cols-[1fr_180px_180px] gap-3">
				<input
					className="p-2 border border-slate-200 rounded outline-slate-400"
					placeholder={t("admin.searchStores")}
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setPage(1);
					}}
				/>
				<select
					className="p-2 border border-slate-200 rounded outline-slate-400"
					value={statusFilter}
					onChange={(event) => {
						setStatusFilter(event.target.value);
						setPage(1);
					}}
				>
					<option value="">{t("admin.allStatuses")}</option>
					{storeStatusOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{t(option.labelKey)}
						</option>
					))}
				</select>
				<select
					className="p-2 border border-slate-200 rounded outline-slate-400"
					value={activeFilter}
					onChange={(event) => {
						setActiveFilter(event.target.value);
						setPage(1);
					}}
				>
					<option value="">{t("admin.allActivity")}</option>
					<option value="true">{t("admin.active")}</option>
					<option value="false">{t("admin.inactive")}</option>
				</select>
			</div>
			<form
				onSubmit={(event) =>
					toast.promise(createStore(event), {
						loading: t("admin.creatingStore"),
					})
				}
				className="mt-4 max-w-5xl border border-slate-200 rounded-lg p-5 bg-white"
			>
				<h2 className="text-lg font-medium text-slate-700">
					{t("admin.createStore")}
				</h2>
				<div className="grid md:grid-cols-2 gap-3 mt-4 text-sm">
					<input
						className="p-2 border border-slate-200 rounded"
						placeholder={t("admin.ownerEmail")}
						value={newStore.userEmail}
						onChange={(e) => updateNewStore("userEmail", e.target.value)}
						type="email"
						required
					/>
					<input
						className="p-2 border border-slate-200 rounded"
						placeholder={t("createStore.username")}
						value={newStore.username}
						onChange={(e) => updateNewStore("username", e.target.value)}
						required
					/>
					<input
						className="p-2 border border-slate-200 rounded"
						placeholder={t("createStore.name")}
						value={newStore.name}
						onChange={(e) => updateNewStore("name", e.target.value)}
						required
					/>
					<input
						className="p-2 border border-slate-200 rounded"
						placeholder={t("createStore.email")}
						value={newStore.email}
						onChange={(e) => updateNewStore("email", e.target.value)}
						type="email"
						required
					/>
					<input
						className="p-2 border border-slate-200 rounded"
						placeholder={t("createStore.contactNumber")}
						value={newStore.contact}
						onChange={(e) => updateNewStore("contact", e.target.value)}
						required
					/>
					<input
						className="p-2 border border-slate-200 rounded"
						placeholder={t("admin.logoUrl")}
						value={newStore.logo}
						onChange={(e) => updateNewStore("logo", e.target.value)}
					/>
					<label className="p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50 text-slate-600">
						{t("admin.uploadLogo")}
						<input
							type="file"
							accept="image/*"
							onChange={(event) => {
								toast.promise(uploadNewStoreLogo(event.target.files?.[0]), {
									loading: t("admin.uploadingLogo"),
								});
								event.target.value = "";
							}}
							hidden
						/>
					</label>
					<textarea
						className="p-2 border border-slate-200 rounded md:col-span-2 resize-none"
						placeholder={t("createStore.description")}
						value={newStore.description}
						onChange={(e) => updateNewStore("description", e.target.value)}
						rows={3}
					/>
					<textarea
						className="p-2 border border-slate-200 rounded md:col-span-2 resize-none"
						placeholder={t("createStore.addressField")}
						value={newStore.address}
						onChange={(e) => updateNewStore("address", e.target.value)}
						rows={2}
						required
					/>
					<div className="flex gap-3 items-center flex-wrap">
						<select
							className="p-2 border border-slate-200 rounded"
							value={newStore.status}
							onChange={(e) => updateNewStore("status", e.target.value)}
						>
							{storeStatusOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{t(option.labelKey)}
								</option>
							))}
						</select>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={newStore.isActive}
								onChange={(e) => updateNewStore("isActive", e.target.checked)}
							/>
							{t("admin.active")}
						</label>
					</div>
				</div>
				<button className="mt-4 bg-[#1A1A1A] text-white px-5 py-2 rounded hover:bg-orange-600 transition">
					{t("admin.createStore")}
				</button>
			</form>
			{stores.length ? (
				<div className="flex flex-col gap-4 mt-4">
					{stores.map((store) => (
						<div
							key={store.id}
							className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 max-w-5xl"
						>
							<StoreInfo store={store} />
							<div className="grid md:grid-cols-2 gap-3 mt-5 text-sm">
								<input
									className="p-2 border border-slate-200 rounded"
									placeholder={t("admin.ownerEmail")}
									value={editingStores[store.id]?.userEmail || ""}
									onChange={(e) =>
										updateEditingStore(store.id, "userEmail", e.target.value)
									}
									type="email"
								/>
								<input
									className="p-2 border border-slate-200 rounded"
									placeholder={t("createStore.username")}
									value={editingStores[store.id]?.username || ""}
									onChange={(e) =>
										updateEditingStore(store.id, "username", e.target.value)
									}
								/>
								<input
									className="p-2 border border-slate-200 rounded"
									placeholder={t("createStore.name")}
									value={editingStores[store.id]?.name || ""}
									onChange={(e) =>
										updateEditingStore(store.id, "name", e.target.value)
									}
								/>
								<input
									className="p-2 border border-slate-200 rounded"
									placeholder={t("createStore.email")}
									value={editingStores[store.id]?.email || ""}
									onChange={(e) =>
										updateEditingStore(store.id, "email", e.target.value)
									}
									type="email"
								/>
								<input
									className="p-2 border border-slate-200 rounded"
									placeholder={t("createStore.contactNumber")}
									value={editingStores[store.id]?.contact || ""}
									onChange={(e) =>
										updateEditingStore(store.id, "contact", e.target.value)
									}
								/>
								<input
									className="p-2 border border-slate-200 rounded"
									placeholder={t("admin.logoUrl")}
									value={editingStores[store.id]?.logo || ""}
									onChange={(e) =>
										updateEditingStore(store.id, "logo", e.target.value)
									}
								/>
								<label className="p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50 text-slate-600">
									{t("admin.uploadLogo")}
									<input
										type="file"
										accept="image/*"
										onChange={(event) => {
											toast.promise(
												uploadEditingStoreLogo(
													store.id,
													event.target.files?.[0],
												),
												{ loading: t("admin.uploadingLogo") },
											);
											event.target.value = "";
										}}
										hidden
									/>
								</label>
								<textarea
									className="p-2 border border-slate-200 rounded md:col-span-2 resize-none"
									placeholder={t("createStore.description")}
									value={editingStores[store.id]?.description || ""}
									onChange={(e) =>
										updateEditingStore(store.id, "description", e.target.value)
									}
									rows={3}
								/>
								<textarea
									className="p-2 border border-slate-200 rounded md:col-span-2 resize-none"
									placeholder={t("createStore.addressField")}
									value={editingStores[store.id]?.address || ""}
									onChange={(e) =>
										updateEditingStore(store.id, "address", e.target.value)
									}
									rows={2}
								/>
								<div className="flex gap-3 items-center flex-wrap">
									<select
										className="p-2 border border-slate-200 rounded"
										value={editingStores[store.id]?.status || "approved"}
										onChange={(e) =>
											updateEditingStore(store.id, "status", e.target.value)
										}
									>
										{storeStatusOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{t(option.labelKey)}
											</option>
										))}
									</select>
									<label className="flex items-center gap-2">
										<input
											type="checkbox"
											checked={Boolean(editingStores[store.id]?.isActive)}
											onChange={(e) =>
												updateEditingStore(
													store.id,
													"isActive",
													e.target.checked,
												)
											}
										/>
										{t("admin.active")}
									</label>
								</div>
								<div className="flex md:justify-end">
									<button
										onClick={() =>
											toast.promise(saveStore(store.id), {
												loading: t("admin.updatingData"),
											})
										}
										className="bg-[#1A1A1A] text-white px-5 py-2 rounded hover:bg-orange-600 transition"
									>
										{t("common.save")}
									</button>
									<button
										type="button"
										onClick={() =>
											toast.promise(deleteStore(store.id), {
												loading: t("admin.deletingStore"),
											})
										}
										className="ml-3 border border-red-200 text-red-600 px-5 py-2 rounded hover:bg-red-50 transition"
									>
										<TrashIcon size={16} />
									</button>
								</div>
							</div>
							<div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
								<h3 className="font-medium text-slate-700">
									{t("admin.storeStaff")}
								</h3>
								<div className="mt-3 grid gap-3 md:grid-cols-[minmax(220px,1fr)_140px_auto_auto]">
									<input
										className="h-10 rounded border border-slate-200 px-3 text-sm"
										placeholder={t("admin.staffEmail")}
										value={staffForms[store.id]?.userEmail || ""}
										onChange={(event) =>
											updateStaffForm(store.id, "userEmail", event.target.value)
										}
									/>
									<select
										className="h-10 rounded border border-slate-200 px-3 text-sm"
										value={staffForms[store.id]?.role || "staff"}
										onChange={(event) =>
											updateStaffForm(store.id, "role", event.target.value)
										}
									>
										<option value="viewer">{t("admin.viewer")}</option>
										<option value="staff">{t("admin.staff")}</option>
										<option value="manager">{t("admin.manager")}</option>
									</select>
									<label className="flex h-10 items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={staffForms[store.id]?.isActive ?? true}
											onChange={(event) =>
												updateStaffForm(
													store.id,
													"isActive",
													event.target.checked,
												)
											}
										/>
										{t("admin.active")}
									</label>
									<button
										type="button"
										onClick={() =>
											toast.promise(grantStaff(store.id), {
												loading: t("admin.grantingStaff"),
											})
										}
										className="rounded bg-[#1A1A1A] px-4 py-2 text-sm text-white hover:bg-orange-600"
									>
										{t("admin.grantAccess")}
									</button>
								</div>
								<div className="mt-3 divide-y divide-slate-200 rounded border border-slate-200 bg-white">
									{(store.staffMembers || []).map((staff) => (
										<div
											key={staff.id}
											className="grid gap-3 p-3 text-sm md:grid-cols-[minmax(220px,1fr)_140px_auto_auto] md:items-center"
										>
											<div>
												<p className="font-medium text-slate-700">
													{staff.user?.name || "-"}
												</p>
												<p className="text-xs text-slate-400">
													{staff.user?.email || "-"}
												</p>
											</div>
											<select
												className="h-9 rounded border border-slate-200 px-2"
												value={staff.role}
												onChange={(event) =>
													toast.promise(
														updateStaff(store.id, staff.id, {
															role: event.target.value,
														}),
														{ loading: t("admin.updatingStaff") },
													)
												}
											>
												<option value="viewer">{t("admin.viewer")}</option>
												<option value="staff">{t("admin.staff")}</option>
												<option value="manager">{t("admin.manager")}</option>
											</select>
											<label className="flex items-center gap-2">
												<input
													type="checkbox"
													checked={staff.isActive}
													onChange={(event) =>
														toast.promise(
															updateStaff(store.id, staff.id, {
																isActive: event.target.checked,
															}),
															{ loading: t("admin.updatingStaff") },
														)
													}
												/>
												{t("admin.active")}
											</label>
											<button
												type="button"
												onClick={() =>
													toast.promise(revokeStaff(store.id, staff.id), {
														loading: t("admin.revokingStaff"),
													})
												}
												className="rounded border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50"
											>
												{t("admin.revokeAccess")}
											</button>
										</div>
									))}
									{(store.staffMembers || []).length === 0 && (
										<p className="p-4 text-center text-sm text-slate-400">
											{t("admin.noStoreStaff")}
										</p>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="flex items-center justify-center h-80">
					<h1 className="text-3xl text-slate-400 font-medium">
						{t("admin.noStoresAvailable")}
					</h1>
				</div>
			)}
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
	) : (
		<Loading />
	);
}
