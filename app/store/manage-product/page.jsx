"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import Loading from "@/components/Loading";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";
import { uploadFiles } from "@/lib/client-upload";
import {
	appendDescriptionAsset,
	plainRichDescription,
} from "@/lib/rich-description.mjs";
import { normalizeProductEditForm } from "@/lib/product-edit-form.mjs";
import { resolveProductImageSrc } from "@/lib/product-image.mjs";
import {
	BoldIcon,
	DownloadIcon,
	Heading2Icon,
	ImagePlusIcon,
	ItalicIcon,
	LinkIcon,
	PencilIcon,
	PaperclipIcon,
	SearchIcon,
	Code2Icon,
	SquareCode,
	TrashIcon,
	XIcon,
} from "lucide-react";

function getInitialStockFilter() {
	if (typeof window === "undefined") return "";
	return new URLSearchParams(window.location.search).get("stock") || "";
}

function productToEditForm(product) {
	return {
		name: product.name || "",
		description: product.description || "",
		category: product.category || "",
		groupId: product.group?.id || product.groupId || "",
		mrp: product.mrp || 0,
		price: product.price || 0,
		inStock: Boolean(product.inStock),
		stockQuantity: product.stockQuantity ?? "",
		images: [...(product.images || [])].slice(0, 4),
		deliveryType: product.deliveryType || "physical",
		digitalAssetName: product.digitalAssetName || "",
		digitalAssetUrl: product.digitalAssetUrl || "",
	};
}

export default function StoreManageProducts() {
	const { t } = useTranslation();
	const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
	const [loading, setLoading] = useState(true);
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [groups, setGroups] = useState([]);
	const [editingProductId, setEditingProductId] = useState(null);
	const [editForm, setEditForm] = useState(null);
	const [inventoryForm, setInventoryForm] = useState({
		mode: "adjust",
		quantity: "",
		reason: "",
	});
	const [inventoryHistory, setInventoryHistory] = useState([]);
	const [query, setQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [groupFilter, setGroupFilter] = useState("");
	const [stockFilter, setStockFilter] = useState(getInitialStockFilter);
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);
	const descriptionRef = useRef(null);
	const imageAttachmentRef = useRef(null);
	const fileAttachmentRef = useRef(null);

	const toggleStock = async (productId) => {
		const product = products.find((item) => item.id === productId);
		const data = await fetchJson(`/api/products/${productId}`, {
			method: "PATCH",
			body: JSON.stringify({ inStock: !product.inStock }),
		});
		setProducts((prev) =>
			prev.map((item) => (item.id === productId ? data.product : item)),
		);
	};
	const startEditing = async (product) => {
		setEditingProductId(product.id);
		setEditForm(productToEditForm(product));
		setInventoryForm({ mode: "adjust", quantity: "", reason: "" });
		const data = await fetchJson(`/api/products/${product.id}/inventory?limit=5`);
		setInventoryHistory(data.adjustments || []);
	};
	const cancelEditing = () => {
		setEditingProductId(null);
		setEditForm(null);
		setInventoryHistory([]);
	};
	const updateEditForm = (field, value) => {
		setEditForm((prev) => ({ ...prev, [field]: value }));
	};
	const insertDescriptionSnippet = (before, after = "", placeholder = "") => {
		const textarea = descriptionRef.current;
		const description = editForm?.description || "";
		const start = textarea?.selectionStart ?? description.length;
		const end = textarea?.selectionEnd ?? description.length;
		const selected = description.slice(start, end) || placeholder;
		const nextDescription = `${description.slice(0, start)}${before}${selected}${after}${description.slice(end)}`;
		updateEditForm("description", nextDescription);
		requestAnimationFrame(() => {
			if (!textarea) return;
			const cursor = start + before.length + selected.length + after.length;
			textarea.focus();
			textarea.setSelectionRange(cursor, cursor);
		});
	};
	const appendDescriptionAttachment = async (file) => {
		if (!file) return;
		const [upload] = await uploadFiles([file]);
		updateEditForm(
			"description",
			appendDescriptionAsset(editForm?.description, {
				name: file.name,
				type: file.type,
				url: upload.url,
			}),
		);
	};
	const updateEditImage = async (index, file) => {
		if (!file) return;
		const [upload] = await uploadFiles([file]);
		setEditForm((prev) => {
			const images = [...(prev.images || [])];
			images[index] = upload.url;
			return { ...prev, images };
		});
	};
	const removeEditImage = (index) => {
		setEditForm((prev) => ({
			...prev,
			images: (prev.images || []).filter((_, imageIndex) => imageIndex !== index),
		}));
	};
	const updateDigitalAsset = async (file) => {
		if (!file) return;
		const [upload] = await uploadFiles([file], { purpose: "digital-download" });
		setEditForm((prev) => ({
			...prev,
			digitalAssetUrl: upload.url,
			digitalAssetName: upload.name || file.name,
		}));
	};
	const saveProduct = async (event) => {
		event.preventDefault();
		const payload = normalizeProductEditForm(editForm);
		const data = await fetchJson(`/api/products/${editingProductId}`, {
			method: "PATCH",
			body: JSON.stringify(payload),
		});
		setProducts((prev) =>
			prev.map((item) => (item.id === editingProductId ? data.product : item)),
		);
		cancelEditing();
	};
	const adjustInventory = async (event) => {
		event.preventDefault();
		const data = await fetchJson(`/api/products/${editingProductId}/inventory`, {
			method: "POST",
			body: JSON.stringify(inventoryForm),
		});
		setProducts((prev) =>
			prev.map((item) => (item.id === editingProductId ? data.product : item)),
		);
		setEditForm((prev) => ({
			...prev,
			stockQuantity: data.product.stockQuantity ?? "",
			inStock: data.product.inStock,
		}));
		setInventoryHistory((prev) => [data.adjustment, ...prev].slice(0, 5));
		setInventoryForm({ mode: "adjust", quantity: "", reason: "" });
	};
	const deleteProduct = async (productId) => {
		if (!window.confirm(t("store.deleteProductConfirm"))) return;
		await fetchJson(`/api/products/${productId}`, { method: "DELETE" });
		setProducts((prev) => prev.filter((item) => item.id !== productId));
		if (editingProductId === productId) cancelEditing();
	};
	const updateInventoryForm = (field, value) => {
		setInventoryForm((prev) => ({ ...prev, [field]: value }));
	};

	useEffect(() => {
		const loadProducts = async () => {
			const params = new URLSearchParams({ mine: "true" });
			if (query.trim()) params.set("q", query.trim());
			if (categoryFilter) params.set("category", categoryFilter);
			if (groupFilter) params.set("group", groupFilter);
			if (stockFilter) params.set("stock", stockFilter);
			params.set("page", String(page));
			const [productData, categoryData, groupData] = await Promise.all([
				fetchJson(`/api/products?${params.toString()}`),
				fetchJson("/api/product-categories?public=true"),
				fetchJson("/api/product-groups?public=true"),
			]);
			setProducts(productData.products || []);
			setPagination(productData.pagination || null);
			setCategories(categoryData.categories || []);
			setGroups(groupData.groups || []);
		};

		loadProducts()
			.catch(() => {
				setProducts([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [categoryFilter, groupFilter, page, query, stockFilter]);
	if (loading) return <Loading />;

	return (
		<>
			<h1 className="text-2xl text-slate-500 mb-5">
				{t("store.manageProducts")}{" "}
				<span className="text-slate-800 font-medium"></span>
			</h1>
			<div className="mb-5 max-w-5xl grid md:grid-cols-[1fr_180px_180px_160px] gap-3">
				<label className="relative">
					<SearchIcon
						size={18}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
					/>
					<input
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							setPage(1);
						}}
						placeholder={t("store.searchProducts")}
						className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded outline-slate-400"
					/>
				</label>
				<select
					value={categoryFilter}
					onChange={(event) => {
						setCategoryFilter(event.target.value);
						setPage(1);
					}}
					className="px-3 py-2 border border-slate-200 rounded outline-slate-400"
				>
					<option value="">{t("shopPage.allCategories")}</option>
					{categories.map((category) => (
						<option key={category.id} value={category.name}>
							{category.name}
						</option>
					))}
				</select>
				<select
					value={groupFilter}
					onChange={(event) => {
						setGroupFilter(event.target.value);
						setPage(1);
					}}
					className="px-3 py-2 border border-slate-200 rounded outline-slate-400"
				>
					<option value="">{t("shopPage.allGroups")}</option>
					{groups.map((group) => (
						<option key={group.id} value={group.slug}>
							{group.name}
						</option>
					))}
				</select>
				<select
					value={stockFilter}
					onChange={(event) => {
						setStockFilter(event.target.value);
						setPage(1);
					}}
					className="px-3 py-2 border border-slate-200 rounded outline-slate-400"
				>
						<option value="">{t("admin.allStock")}</option>
						<option value="low">{t("admin.lowStock")}</option>
						<option value="in">{t("store.inStock")}</option>
						<option value="out">{t("admin.outOfStock")}</option>
				</select>
			</div>
			{editingProductId && editForm && (
				<form
					onSubmit={(event) =>
						toast.promise(saveProduct(event), {
							loading: t("store.savingProduct"),
						})
					}
					className="mb-8 max-w-4xl border border-slate-200 rounded-lg p-5 bg-white text-slate-600"
				>
					<div className="flex items-center justify-between gap-4">
						<h2 className="text-xl font-medium text-slate-800">
							{t("store.editProduct")}
						</h2>
						<button
							type="button"
							onClick={cancelEditing}
							className="size-9 border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50"
							title={t("common.close")}
						>
							<XIcon size={18} />
						</button>
					</div>
					<div className="grid md:grid-cols-2 gap-4 mt-5 text-sm">
						<label className="flex flex-col gap-2">
							{t("store.productName")}
							<input
								className="p-2 border border-slate-200 rounded outline-slate-400"
								value={editForm.name}
								onChange={(event) => updateEditForm("name", event.target.value)}
								required
							/>
						</label>
						<label className="flex flex-col gap-2">
							{t("store.selectCategory")}
							<select
								className="p-2 border border-slate-200 rounded outline-slate-400"
								value={editForm.category}
								onChange={(event) =>
									setEditForm((prev) => ({
										...prev,
										category: event.target.value,
									}))
								}
								required
							>
								<option value="">{t("store.selectCategory")}</option>
								{categories.map((category) => (
									<option key={category.id} value={category.name}>
										{category.name}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-2">
							{t("store.selectGroup")}
							<select
								className="p-2 border border-slate-200 rounded outline-slate-400"
								value={editForm.groupId}
								onChange={(event) =>
									setEditForm((prev) => ({
										...prev,
										groupId: event.target.value,
									}))
								}
							>
								<option value="">{t("store.selectGroup")}</option>
								{groups.map((group) => (
									<option key={group.id} value={group.id}>
										{group.name}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-2">
							{t("store.actualPrice")}
							<input
								type="number"
								className="p-2 border border-slate-200 rounded outline-slate-400"
								value={editForm.mrp}
								onChange={(event) => updateEditForm("mrp", event.target.value)}
								required
							/>
						</label>
						<label className="flex flex-col gap-2">
							{t("store.offerPrice")}
							<input
								type="number"
								className="p-2 border border-slate-200 rounded outline-slate-400"
								value={editForm.price}
								onChange={(event) => updateEditForm("price", event.target.value)}
								required
							/>
						</label>
						<label className="flex flex-col gap-2">
							{t("store.stockQuantity")}
							<input
								type="number"
								min="0"
								className="p-2 border border-slate-200 rounded outline-slate-400"
								value={editForm.stockQuantity}
								onChange={(event) =>
									updateEditForm("stockQuantity", event.target.value)
								}
								placeholder={t("store.unlimitedStock")}
							/>
						</label>
						<div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
							<p className="font-medium text-slate-800">
								{t("store.deliveryType")}
							</p>
							<div className="mt-3 flex flex-wrap gap-3">
								<label className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2">
									<input
										type="radio"
										name="editDeliveryType"
										value="physical"
										checked={editForm.deliveryType === "physical"}
										onChange={(event) =>
											setEditForm((prev) => ({
												...prev,
												deliveryType: event.target.value,
											}))
										}
									/>
									{t("store.physicalProduct")}
								</label>
								<label className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2">
									<input
										type="radio"
										name="editDeliveryType"
										value="digital"
										checked={editForm.deliveryType === "digital"}
										onChange={(event) =>
											setEditForm((prev) => ({
												...prev,
												deliveryType: event.target.value,
											}))
										}
									/>
									{t("store.digitalProduct")}
								</label>
							</div>
							{editForm.deliveryType === "digital" && (
								<div className="mt-4">
									<label className="inline-flex cursor-pointer items-center gap-2 rounded bg-[#1A1A1A] px-4 py-2 text-sm text-white hover:bg-orange-600">
										<DownloadIcon size={16} />
										{t("store.uploadDigitalFile")}
										<input
											type="file"
											accept="*/*"
											onChange={(event) => {
												toast.promise(
													updateDigitalAsset(event.target.files?.[0]),
													{ loading: t("store.uploadingFile") },
												);
												event.target.value = "";
											}}
											hidden
										/>
									</label>
									<p className="mt-2 text-xs text-slate-500">
										{editForm.digitalAssetName || t("store.noDigitalFile")}
									</p>
								</div>
							)}
						</div>
						<div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
							<h3 className="font-medium text-slate-800">
								{t("store.inventoryAdjustment")}
							</h3>
							<div className="mt-3 grid gap-3 md:grid-cols-[150px_140px_minmax(220px,1fr)_auto]">
								<select
									className="h-10 rounded border border-slate-200 px-3"
									value={inventoryForm.mode}
									onChange={(event) =>
										updateInventoryForm("mode", event.target.value)
									}
								>
									<option value="adjust">{t("store.adjustStock")}</option>
									<option value="set">{t("store.setStock")}</option>
								</select>
								<input
									type="number"
									className="h-10 rounded border border-slate-200 px-3"
									value={inventoryForm.quantity}
									onChange={(event) =>
										updateInventoryForm("quantity", event.target.value)
									}
									placeholder={
										inventoryForm.mode === "adjust"
											? t("store.stockDelta")
											: t("store.stockQuantity")
									}
								/>
								<input
									className="h-10 rounded border border-slate-200 px-3"
									value={inventoryForm.reason}
									onChange={(event) =>
										updateInventoryForm("reason", event.target.value)
									}
									placeholder={t("store.inventoryReason")}
								/>
								<button
									type="button"
									onClick={(event) =>
										toast.promise(adjustInventory(event), {
											loading: t("store.adjustingInventory"),
											success: t("store.inventoryAdjusted"),
											error: (error) => error.message,
										})
									}
									className="rounded bg-[#1A1A1A] px-4 py-2 text-sm text-white hover:bg-orange-600"
								>
									{t("store.applyInventory")}
								</button>
							</div>
							<div className="mt-3 rounded border border-slate-200 bg-white">
								{inventoryHistory.map((entry) => (
									<div
										key={entry.id}
										className="grid gap-2 border-b border-slate-100 p-3 text-xs text-slate-500 last:border-b-0 md:grid-cols-[90px_120px_minmax(160px,1fr)_160px]"
									>
										<span className={entry.delta >= 0 ? "text-green-600" : "text-red-600"}>
											{entry.delta > 0 ? "+" : ""}
											{entry.delta}
										</span>
										<span>
											{entry.previousQuantity ?? "-"} → {entry.nextQuantity ?? "-"}
										</span>
										<span className="text-slate-700">{entry.reason}</span>
										<span>{new Date(entry.createdAt).toLocaleString()}</span>
									</div>
								))}
								{inventoryHistory.length === 0 && (
									<p className="p-3 text-center text-xs text-slate-400">
										{t("store.noInventoryHistory")}
									</p>
								)}
							</div>
						</div>
					<label className="flex flex-col gap-2 md:col-span-2">
						{t("store.productDescription")}
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								title={t("store.markdownHeading")}
								onClick={() => insertDescriptionSnippet("## ", "", "Heading")}
								className="size-9 border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50"
							>
								<Heading2Icon size={17} />
							</button>
							<button
								type="button"
								title={t("store.markdownBold")}
								onClick={() => insertDescriptionSnippet("**", "**", "bold")}
								className="size-9 border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50"
							>
								<BoldIcon size={17} />
							</button>
							<button
								type="button"
								title={t("store.markdownItalic")}
								onClick={() => insertDescriptionSnippet("*", "*", "italic")}
								className="size-9 border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50"
							>
								<ItalicIcon size={17} />
							</button>
							<button
								type="button"
								title={t("store.markdownLink")}
								onClick={() =>
									insertDescriptionSnippet("[", "](https://example.com)", "link")
								}
								className="size-9 border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50"
							>
								<LinkIcon size={17} />
							</button>
							<button
								type="button"
								title={t("store.markdownCode")}
								onClick={() => insertDescriptionSnippet("`", "`", "code")}
								className="size-9 border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50"
							>
								<Code2Icon size={17} />
							</button>
							<button
								type="button"
								title={t("store.markdownCodeBlock")}
								onClick={() =>
									insertDescriptionSnippet("\n```\n", "\n```\n", "code block")
								}
								className="size-9 border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50"
							>
								<SquareCode size={17} />
							</button>
							<button
								type="button"
								title={t("store.attachDescriptionImage")}
								onClick={() => imageAttachmentRef.current?.click()}
								className="size-9 border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50"
							>
								<ImagePlusIcon size={17} />
							</button>
							<button
								type="button"
								title={t("store.attachDescriptionFile")}
								onClick={() => fileAttachmentRef.current?.click()}
								className="size-9 border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50"
							>
								<PaperclipIcon size={17} />
							</button>
							<input
								ref={imageAttachmentRef}
								type="file"
								accept="image/*"
								onChange={(e) => {
									toast.promise(appendDescriptionAttachment(e.target.files?.[0]), {
										loading: t("store.uploadingFile"),
									});
									e.target.value = "";
								}}
								hidden
							/>
							<input
								ref={fileAttachmentRef}
								type="file"
								accept="*/*"
								onChange={(e) => {
									toast.promise(appendDescriptionAttachment(e.target.files?.[0]), {
										loading: t("store.uploadingFile"),
									});
									e.target.value = "";
								}}
								hidden
							/>
						</div>
						<textarea
							ref={descriptionRef}
							className="p-2 border border-slate-200 rounded outline-slate-400 font-mono text-sm resize-y"
							value={editForm.description}
							onChange={(event) =>
								updateEditForm("description", event.target.value)
							}
							rows={8}
							required
						/>
					</label>
						<div className="md:col-span-2">
							<p>{t("store.productImages")}</p>
							<div className="flex flex-wrap gap-3 mt-2">
								{[0, 1, 2, 3].map((index) => (
									<div key={index} className="relative">
										<label className="size-24 border border-slate-200 rounded flex items-center justify-center cursor-pointer bg-slate-50 overflow-hidden">
											{editForm.images?.[index] ? (
												<Image
													src={resolveProductImageSrc(editForm.images[index])}
													alt=""
													width={96}
													height={96}
													className="size-24 object-cover"
												/>
											) : (
												<ImagePlusIcon size={24} className="text-slate-400" />
											)}
											<input
												type="file"
												accept="image/*"
												onChange={(event) => {
													toast.promise(
														updateEditImage(index, event.target.files?.[0]),
														{ loading: t("store.uploadingFile") },
													);
													event.target.value = "";
												}}
												hidden
											/>
										</label>
										{editForm.images?.[index] && (
											<button
												type="button"
												onClick={() => removeEditImage(index)}
												className="absolute -top-2 -right-2 size-6 rounded-full bg-slate-800 text-white flex items-center justify-center"
												title={t("common.delete")}
											>
												<XIcon size={14} />
											</button>
										)}
									</div>
								))}
							</div>
						</div>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={editForm.inStock}
								onChange={(event) =>
									updateEditForm("inStock", event.target.checked)
								}
							/>
							{t("store.inStock")}
						</label>
						<div className="flex md:justify-end gap-3">
							<button
								type="button"
								onClick={cancelEditing}
								className="px-5 py-2 border border-slate-200 rounded hover:bg-slate-50"
							>
								{t("common.close")}
							</button>
							<button className="px-5 py-2 bg-[#1A1A1A] text-white rounded hover:bg-orange-600 transition">
								{t("common.save")}
							</button>
						</div>
					</div>
				</form>
			)}
			<table className="w-full max-w-4xl text-left ring ring-slate-200 rounded overflow-hidden text-sm">
				<thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
					<tr>
						<th className="px-4 py-3">{t("store.name")}</th>
						<th className="px-4 py-3 hidden md:table-cell">
							{t("store.description")}
						</th>
						<th className="px-4 py-3 hidden md:table-cell">{t("store.mrp")}</th>
						<th className="px-4 py-3">{t("store.price")}</th>
						<th className="px-4 py-3">{t("store.actions")}</th>
					</tr>
				</thead>
				<tbody className="text-slate-700">
					{products.map((product) => (
						<tr
							key={product.id}
							className="border-t border-gray-200 hover:bg-gray-50"
						>
							<td className="px-4 py-3">
								<div className="flex gap-2 items-center">
									<Image
										width={40}
										height={40}
										className="p-1 shadow rounded cursor-pointer"
										src={resolveProductImageSrc(product.images?.[0])}
										alt=""
									/>
									{product.name}
								</div>
							</td>
							<td className="px-4 py-3 max-w-md text-slate-600 hidden md:table-cell truncate">
								{plainRichDescription(product.description)}
							</td>
							<td className="px-4 py-3 hidden md:table-cell">
								{currency} {product.mrp.toLocaleString()}
							</td>
							<td className="px-4 py-3">
								<div>
									<p>
										{currency} {product.price.toLocaleString()}
									</p>
									<p className="text-xs text-slate-400">
										{product.deliveryType === "digital"
											? t("store.digitalProduct")
											: product.stockQuantity ?? t("store.unlimitedStock")}
									</p>
								</div>
							</td>
							<td className="px-4 py-3 text-center">
								<div className="flex items-center justify-center gap-4">
									<button
										type="button"
										onClick={() =>
											toast.promise(startEditing(product), {
												loading: t("store.loadingInventory"),
											})
										}
										className="text-slate-500 hover:text-orange-600"
										title={t("store.editProduct")}
									>
										<PencilIcon size={18} />
									</button>
									<label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
										<input
											type="checkbox"
											className="sr-only peer"
											onChange={() =>
												toast.promise(toggleStock(product.id), {
													loading: t("admin.updatingData"),
												})
											}
											checked={product.inStock}
										/>
										<div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-[#22C55E] transition-colors duration-200"></div>
										<span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
									</label>
									<button
										type="button"
										onClick={() =>
											toast.promise(deleteProduct(product.id), {
												loading: t("store.deletingProduct"),
											})
										}
										className="text-red-500 hover:text-red-700"
										title={t("common.delete")}
									>
										<TrashIcon size={18} />
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{!products.length && (
				<div className="max-w-4xl py-14 text-center text-slate-400">
					{t("shopPage.noProductsFound")}
				</div>
			)}
			{pagination && pagination.totalPages > 1 && (
				<div className="mt-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
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
		</>
	);
}
