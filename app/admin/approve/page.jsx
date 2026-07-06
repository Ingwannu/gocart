"use client";
import StoreInfo from "@/components/admin/StoreInfo";
import Loading from "@/components/Loading";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";

export default function AdminApprove() {
	const { t } = useTranslation();
	const [stores, setStores] = useState([]);
	const [loading, setLoading] = useState(true);

	const handleApprove = async ({ storeId, status }) => {
		await fetchJson(`/api/stores/${storeId}`, {
			method: "PATCH",
			body: JSON.stringify({ status }),
		});
		setStores((prev) => prev.filter((store) => store.id !== storeId));
	};

	useEffect(() => {
		fetchJson("/api/stores?status=pending")
			.then((data) => setStores(data.stores || []))
			.catch(() => setStores([]))
			.finally(() => setLoading(false));
	}, []);

	return !loading ? (
		<div className="text-muted-foreground mb-28">
			<h1 className="text-2xl">
				{t("admin.approve")}{" "}
				<span className="text-foreground font-medium">{t("admin.stores")}</span>
			</h1>
			{stores.length ? (
				<div className="flex flex-col gap-4 mt-4">
					{stores.map((store) => (
						<div
							key={store.id}
							className="bg-frame border rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl"
						>
							<StoreInfo store={store} />
							<div className="flex gap-3 pt-2 flex-wrap">
								<button
									onClick={() =>
										toast.promise(
											handleApprove({ storeId: store.id, status: "approved" }),
											{ loading: t("admin.approving") },
										)
									}
									className="px-4 py-2 bg-success text-white rounded hover:brightness-110 text-sm"
								>
									{t("admin.approve")}
								</button>
								<button
									onClick={() =>
										toast.promise(
											handleApprove({ storeId: store.id, status: "rejected" }),
											{ loading: t("admin.rejecting") },
										)
									}
									className="px-4 py-2 bg-muted-foreground text-frame rounded hover:brightness-95 text-sm"
								>
									{t("admin.reject")}
								</button>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="flex items-center justify-center h-80">
					<h1 className="text-3xl text-muted-foreground font-medium">
						{t("admin.noApplicationPending")}
					</h1>
				</div>
			)}
		</div>
	) : (
		<Loading />
	);
}
