"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { TrashIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const emptyGroup = { name: "", description: "", sortOrder: 0, isActive: true };

export default function AdminGroups() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [groups, setGroups] = useState([]);
	const [newGroup, setNewGroup] = useState(emptyGroup);
	const [editing, setEditing] = useState({});
	const [q, setQ] = useState("");
	const [active, setActive] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);

	const loadGroups = async (requestedPage = page) => {
		const params = new URLSearchParams();
		if (q.trim()) params.set("q", q.trim());
		if (active) params.set("active", active);
		params.set("page", String(requestedPage));

		const data = await fetchJson(`/api/product-groups?${params.toString()}`);
		setGroups(data.groups || []);
		setPagination(data.pagination || null);
		if (data.pagination?.page && data.pagination.page !== page) {
			setPage(data.pagination.page);
		}
		setEditing((data.groups || []).reduce((forms, group) => ({ ...forms, [group.id]: group }), {}));
	};
	useEffect(() => {
		loadGroups()
			.catch(() => {
				setGroups([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [page, q, active]);

	const createGroup = async (event) => {
		event.preventDefault();
		await fetchJson("/api/product-groups", { method: "POST", body: JSON.stringify(newGroup) });
		setNewGroup(emptyGroup);
		if (page !== 1) {
			setPage(1);
		} else {
			await loadGroups(1);
		}
	};
	const saveGroup = async (groupId) => {
		const data = await fetchJson(`/api/product-groups/${groupId}`, { method: "PATCH", body: JSON.stringify(editing[groupId]) });
		if (active) {
			await loadGroups();
		} else {
			setGroups((prev) => prev.map((group) => group.id === groupId ? data.group : group));
		}
	};
	const deleteGroup = async (groupId) => {
		if (!window.confirm(t("admin.deleteGroupConfirm"))) return;
		await fetchJson(`/api/product-groups/${groupId}`, { method: "DELETE" });
		await loadGroups();
	};

	if (loading) return <Loading />;

	return (
		<div className="text-muted-foreground mb-28">
			<h1 className="text-2xl">{t("admin.groups")} <span className="text-foreground font-medium">{t("admin.management")}</span></h1>
			<form onSubmit={(e) => toast.promise(createGroup(e), { loading: t("admin.creatingGroup") })} className="mt-5 max-w-5xl border border-border rounded-lg p-5 bg-frame grid md:grid-cols-4 gap-3 text-sm">
				<input className="p-2 border border-border rounded" placeholder={t("admin.groupName")} value={newGroup.name} onChange={(e) => setNewGroup((p) => ({ ...p, name: e.target.value }))} required />
				<input className="p-2 border border-border rounded" placeholder={t("admin.description")} value={newGroup.description} onChange={(e) => setNewGroup((p) => ({ ...p, description: e.target.value }))} />
				<input className="p-2 border border-border rounded" type="number" placeholder={t("admin.sortOrder")} value={newGroup.sortOrder} onChange={(e) => setNewGroup((p) => ({ ...p, sortOrder: e.target.value }))} />
				<div className="flex gap-2 items-center">
					<label className="flex items-center gap-2"><input type="checkbox" checked={newGroup.isActive} onChange={(e) => setNewGroup((p) => ({ ...p, isActive: e.target.checked }))} />{t("admin.active")}</label>
					<button className="bg-accent text-accent-foreground px-4 py-2 rounded hover:brightness-95">{t("admin.createGroup")}</button>
				</div>
			</form>
			<div className="mt-5 max-w-5xl rounded-lg border border-border bg-frame p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_170px_auto]">
					<input
						type="search"
						value={q}
						onChange={(e) => {
							setQ(e.target.value);
							setPage(1);
						}}
						placeholder={t("admin.searchGroups")}
						className="h-10 rounded border border-border px-3 text-sm text-foreground outline-none focus:border-ring"
					/>
					<select
						value={active}
						onChange={(e) => {
							setActive(e.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-border px-3 text-sm text-foreground"
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
						className="h-10 rounded border border-border px-4 text-sm text-foreground hover:bg-muted"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
				<p className="mt-3 text-xs text-muted-foreground">
					{t("admin.showingGroups", {
						count: pagination?.total ?? groups.length,
					})}
				</p>
			</div>
			<div className="overflow-x-auto mt-5 rounded-lg border border-border max-w-5xl">
				<table className="min-w-full bg-frame text-sm">
					<thead className="bg-muted text-muted-foreground"><tr><th className="py-3 px-4 text-left">{t("admin.groupName")}</th><th className="py-3 px-4 text-left">Slug</th><th className="py-3 px-4 text-left">{t("admin.description")}</th><th className="py-3 px-4 text-left">{t("admin.sortOrder")}</th><th className="py-3 px-4 text-left">{t("admin.active")}</th><th className="py-3 px-4 text-left">{t("admin.action")}</th></tr></thead>
					<tbody className="divide-y divide-border">
						{groups.map((group) => (
							<tr key={group.id}>
								<td className="py-3 px-4"><input className="p-2 border border-border rounded" value={editing[group.id]?.name || ""} onChange={(e) => setEditing((p) => ({ ...p, [group.id]: { ...p[group.id], name: e.target.value } }))} /></td>
								<td className="py-3 px-4 text-foreground">{group.slug}</td>
								<td className="py-3 px-4"><input className="p-2 border border-border rounded w-full" value={editing[group.id]?.description || ""} onChange={(e) => setEditing((p) => ({ ...p, [group.id]: { ...p[group.id], description: e.target.value } }))} /></td>
								<td className="py-3 px-4"><input className="p-2 border border-border rounded w-24" type="number" step="1" value={editing[group.id]?.sortOrder ?? 0} onChange={(e) => setEditing((p) => ({ ...p, [group.id]: { ...p[group.id], sortOrder: e.target.value } }))} /></td>
								<td className="py-3 px-4"><input type="checkbox" checked={Boolean(editing[group.id]?.isActive)} onChange={(e) => setEditing((p) => ({ ...p, [group.id]: { ...p[group.id], isActive: e.target.checked } }))} /></td>
								<td className="py-3 px-4"><div className="flex gap-3"><button onClick={() => toast.promise(saveGroup(group.id), { loading: t("admin.updatingData") })} className="px-3 py-2 bg-accent text-accent-foreground rounded">{t("common.save")}</button><button onClick={() => toast.promise(deleteGroup(group.id), { loading: t("admin.deletingGroup") })} className="text-danger"><TrashIcon size={18} /></button></div></td>
							</tr>
						))}
						{groups.length === 0 && (
							<tr>
								<td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">
									{t("admin.noGroupsFound")}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			{pagination && pagination.totalPages > 1 && (
				<div className="mt-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
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
	);
}
