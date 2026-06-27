"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { TrashIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const emptyUser = { name: "", email: "", password: "", role: "user" };
const roles = ["user", "member", "seller", "admin"];
const accountStatuses = [
	{ value: "active", labelKey: "admin.active" },
	{ value: "suspended", labelKey: "admin.suspended" },
];

export default function AdminUsers() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [users, setUsers] = useState([]);
	const [newUser, setNewUser] = useState(emptyUser);
	const [editing, setEditing] = useState({});
	const [query, setQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);

	const loadUsers = async (requestedPage = page) => {
		const params = new URLSearchParams();
		if (query.trim()) params.set("q", query.trim());
		if (roleFilter) params.set("role", roleFilter);
		if (statusFilter) params.set("status", statusFilter);
		params.set("page", String(requestedPage));
		const data = await fetchJson(`/api/users?${params.toString()}`);
		setUsers(data.users || []);
		setPagination(data.pagination || null);
		if (data.pagination?.page && data.pagination.page !== page) {
			setPage(data.pagination.page);
		}
		setEditing(
			(data.users || []).reduce((forms, user) => {
				forms[user.id] = {
					name: user.name,
					email: user.email,
					role: user.role,
					isSuspended: Boolean(user.isSuspended),
					password: "",
				};
				return forms;
			}, {}),
		);
	};

	useEffect(() => {
		loadUsers()
			.catch(() => {
				setUsers([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [page, query, roleFilter, statusFilter]);

	const createUser = async (event) => {
		event.preventDefault();
		const data = await fetchJson("/api/users", {
			method: "POST",
			body: JSON.stringify(newUser),
		});
		setUsers((prev) => [...prev, data.user]);
		setEditing((prev) => ({
			...prev,
			[data.user.id]: {
				name: data.user.name,
				email: data.user.email,
				role: data.user.role,
				isSuspended: Boolean(data.user.isSuspended),
				password: "",
			},
		}));
		setNewUser(emptyUser);
		if (page !== 1) {
			setPage(1);
		} else {
			await loadUsers(1);
		}
	};
	const saveUser = async (userId) => {
		const data = await fetchJson(`/api/users/${userId}`, {
			method: "PATCH",
			body: JSON.stringify(editing[userId]),
		});
		setUsers((prev) => prev.map((user) => (user.id === userId ? data.user : user)));
	};
	const deleteUser = async (userId) => {
		if (!window.confirm(t("admin.deleteUserConfirm"))) return;
		await fetchJson(`/api/users/${userId}`, { method: "DELETE" });
		await loadUsers();
	};

	if (loading) return <Loading />;

	return (
		<div className="text-slate-500 mb-28">
			<h1 className="text-2xl">
				{t("admin.users")} <span className="text-slate-800 font-medium">{t("admin.management")}</span>
			</h1>
			<div className="mt-5 max-w-5xl grid md:grid-cols-[1fr_180px_180px] gap-3">
				<input
					className="p-2 border border-slate-200 rounded outline-slate-400"
					placeholder={t("admin.searchUsers")}
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setPage(1);
					}}
				/>
				<select
					className="p-2 border border-slate-200 rounded outline-slate-400"
					value={roleFilter}
					onChange={(event) => {
						setRoleFilter(event.target.value);
						setPage(1);
					}}
				>
					<option value="">{t("admin.allRoles")}</option>
					{roles.map((role) => (
						<option key={role} value={role}>
							{role}
						</option>
					))}
				</select>
				<select
					className="p-2 border border-slate-200 rounded outline-slate-400"
					value={statusFilter}
					onChange={(event) => {
						setStatusFilter(event.target.value);
						setPage(1);
					}}
				>
					<option value="">{t("admin.allAccountStatuses")}</option>
					{accountStatuses.map((status) => (
						<option key={status.value} value={status.value}>
							{t(status.labelKey)}
						</option>
					))}
				</select>
			</div>
			<form
				onSubmit={(event) => toast.promise(createUser(event), { loading: t("admin.creatingUser") })}
				className="mt-5 max-w-5xl border border-slate-200 rounded-lg p-5 bg-white grid md:grid-cols-4 gap-3 text-sm"
			>
				<input className="p-2 border border-slate-200 rounded" placeholder={t("signupPage.nameLabel")} value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} required />
				<input className="p-2 border border-slate-200 rounded" placeholder={t("loginPage.emailLabel")} type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} required />
				<input className="p-2 border border-slate-200 rounded" placeholder={t("loginPage.passwordLabel")} type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required />
				<div className="flex gap-2">
					<select className="p-2 border border-slate-200 rounded flex-1" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
						{roles.map((role) => <option key={role} value={role}>{role}</option>)}
					</select>
					<button className="bg-[#1A1A1A] text-white px-4 rounded hover:bg-orange-600">{t("admin.createUser")}</button>
				</div>
			</form>
			<div className="overflow-x-auto mt-5 rounded-lg border border-slate-200 max-w-5xl">
				<table className="min-w-full bg-white text-sm">
					<thead className="bg-slate-50 text-slate-600">
						<tr>
							<th className="py-3 px-4 text-left">{t("signupPage.nameLabel")}</th>
							<th className="py-3 px-4 text-left">{t("loginPage.emailLabel")}</th>
							<th className="py-3 px-4 text-left">{t("admin.role")}</th>
							<th className="py-3 px-4 text-left">{t("admin.status")}</th>
							<th className="py-3 px-4 text-left">{t("admin.store")}</th>
							<th className="py-3 px-4 text-left">{t("admin.action")}</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{users.map((user) => (
							<tr key={user.id}>
								<td className="py-3 px-4"><input className="p-2 border border-slate-200 rounded" value={editing[user.id]?.name || ""} onChange={(e) => setEditing((p) => ({ ...p, [user.id]: { ...p[user.id], name: e.target.value } }))} /></td>
								<td className="py-3 px-4">
									<input
										className="p-2 border border-slate-200 rounded min-w-56"
										type="email"
										value={editing[user.id]?.email || ""}
										onChange={(e) => setEditing((p) => ({ ...p, [user.id]: { ...p[user.id], email: e.target.value } }))}
									/>
								</td>
								<td className="py-3 px-4"><select className="p-2 border border-slate-200 rounded" value={editing[user.id]?.role || user.role} onChange={(e) => setEditing((p) => ({ ...p, [user.id]: { ...p[user.id], role: e.target.value } }))}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></td>
								<td className="py-3 px-4">
									<select
										className="p-2 border border-slate-200 rounded"
										value={editing[user.id]?.isSuspended ? "suspended" : "active"}
										onChange={(e) =>
											setEditing((p) => ({
												...p,
												[user.id]: {
													...p[user.id],
													isSuspended: e.target.value === "suspended",
												},
											}))
										}
									>
										{accountStatuses.map((status) => (
											<option key={status.value} value={status.value}>
												{t(status.labelKey)}
											</option>
										))}
									</select>
								</td>
								<td className="py-3 px-4 text-slate-700">{user.store?.name || "-"}</td>
								<td className="py-3 px-4">
									<div className="flex gap-3 items-center">
										<input className="p-2 border border-slate-200 rounded w-36" type="password" placeholder={t("admin.newPassword")} value={editing[user.id]?.password || ""} onChange={(e) => setEditing((p) => ({ ...p, [user.id]: { ...p[user.id], password: e.target.value } }))} />
										<button onClick={() => toast.promise(saveUser(user.id), { loading: t("admin.updatingData") })} className="px-3 py-2 bg-[#1A1A1A] text-white rounded">{t("common.save")}</button>
										<button type="button" onClick={() => toast.promise(deleteUser(user.id), { loading: t("admin.deletingUser") })} className="text-red-500"><TrashIcon size={18} /></button>
									</div>
								</td>
							</tr>
						))}
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
