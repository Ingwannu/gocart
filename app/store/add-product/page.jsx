"use client";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { upsertProduct } from "@/lib/features/product/productSlice";
import { uploadFiles } from "@/lib/client-upload";
import { appendDescriptionAsset } from "@/lib/rich-description.mjs";
import {
	BoldIcon,
	Code2Icon,
	DownloadIcon,
	Heading2Icon,
	ImagePlusIcon,
	ItalicIcon,
	LinkIcon,
	PaperclipIcon,
	SquareCode,
} from "lucide-react";

export default function StoreAddProduct() {
	const { t } = useTranslation();
	const router = useRouter();
	const dispatch = useDispatch();
	const descriptionRef = useRef(null);
	const imageAttachmentRef = useRef(null);
	const fileAttachmentRef = useRef(null);
	const digitalAssetRef = useRef(null);
	const [categories, setCategories] = useState([]);
	const [groups, setGroups] = useState([]);
	const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null });
	const [productInfo, setProductInfo] = useState({
		name: "",
		description: "",
		mrp: 0,
		price: 0,
		category: "",
		groupId: "",
		stockQuantity: "",
		deliveryType: "physical",
		digitalAssetUrl: "",
		digitalAssetName: "",
	});
	const [loading, setLoading] = useState(false);

	const onChangeHandler = (e) => {
		setProductInfo({ ...productInfo, [e.target.name]: e.target.value });
	};
	useEffect(() => {
		Promise.all([
			fetchJson("/api/product-categories?public=true"),
			fetchJson("/api/product-groups?public=true"),
		])
			.then(([categoryData, groupData]) => {
				setCategories(categoryData.categories || []);
				setGroups(groupData.groups || []);
			})
			.catch(() => {
				setCategories([]);
				setGroups([]);
			});
	}, []);
	const setDescription = (description) => {
		setProductInfo((prev) => ({ ...prev, description }));
	};
	const insertDescriptionSnippet = (before, after = "", placeholder = "") => {
		const textarea = descriptionRef.current;
		const description = productInfo.description || "";
		const start = textarea?.selectionStart ?? description.length;
		const end = textarea?.selectionEnd ?? description.length;
		const selected = description.slice(start, end) || placeholder;
		const nextDescription = `${description.slice(0, start)}${before}${selected}${after}${description.slice(end)}`;
		setDescription(nextDescription);
		requestAnimationFrame(() => {
			if (!textarea) return;
			const cursor = start + before.length + selected.length + after.length;
			textarea.focus();
			textarea.setSelectionRange(cursor, cursor);
		});
	};
	const appendAttachment = async (file) => {
		if (!file) return;
		const [upload] = await uploadFiles([file]);
		setDescription(
			appendDescriptionAsset(productInfo.description, {
				name: file.name,
				type: file.type,
				url: upload.url,
			}),
		);
	};
	const uploadDigitalAsset = async (file) => {
		if (!file) return;
		const [upload] = await uploadFiles([file], { purpose: "digital-download" });
		setProductInfo((prev) => ({
			...prev,
			digitalAssetUrl: upload.url,
			digitalAssetName: upload.name || file.name,
		}));
	};
	const onSubmitHandler = async (e) => {
		e.preventDefault();
		setLoading(true);
		try {
			const imageFiles = Object.values(images).filter(Boolean);
			const imageUploads = await uploadFiles(imageFiles);

			const data = await fetchJson("/api/products", {
				method: "POST",
				body: JSON.stringify({
					...productInfo,
					images: imageUploads.map((upload) => upload.url),
				}),
			});
			dispatch(upsertProduct(data.product));
			router.push("/store/manage-product");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form
			onSubmit={(e) =>
				toast.promise(onSubmitHandler(e), { loading: t("store.addingProduct") })
			}
			className="text-muted-foreground mb-28"
		>
			<h1 className="text-2xl">
				{t("store.addNewProducts")}{" "}
				<span className="text-foreground font-medium"></span>
			</h1>
			<p className="mt-7">{t("store.productImages")}</p>
			<div htmlFor="" className="flex gap-3 mt-4">
				{Object.keys(images).map((key) => (
					<label key={key} htmlFor={`images${key}`}>
						<Image
							width={300}
							height={300}
							className="h-15 w-auto border border-border rounded cursor-pointer"
							src={
								images[key]
									? URL.createObjectURL(images[key])
									: assets.upload_area
							}
							alt=""
						/>
						<input
							type="file"
							accept="image/*"
							id={`images${key}`}
							onChange={(e) =>
								setImages({ ...images, [key]: e.target.files[0] })
							}
							hidden
						/>
					</label>
				))}
			</div>
			<label className="flex flex-col gap-2 my-6">
				{t("store.productName")}
				<input
					type="text"
					name="name"
					onChange={onChangeHandler}
					value={productInfo.name}
					placeholder={t("store.enterProductName")}
					className="w-full max-w-sm p-2 px-4 outline-none border border-border rounded"
					required
				/>
			</label>
			<label className="flex flex-col gap-2 my-6">
				{t("store.productDescription")}
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						title={t("store.markdownHeading")}
						onClick={() => insertDescriptionSnippet("## ", "", "Heading")}
						className="size-9 border border-border rounded flex items-center justify-center hover:bg-muted"
					>
						<Heading2Icon size={17} />
					</button>
					<button
						type="button"
						title={t("store.markdownBold")}
						onClick={() => insertDescriptionSnippet("**", "**", "bold")}
						className="size-9 border border-border rounded flex items-center justify-center hover:bg-muted"
					>
						<BoldIcon size={17} />
					</button>
					<button
						type="button"
						title={t("store.markdownItalic")}
						onClick={() => insertDescriptionSnippet("*", "*", "italic")}
						className="size-9 border border-border rounded flex items-center justify-center hover:bg-muted"
					>
						<ItalicIcon size={17} />
					</button>
					<button
						type="button"
						title={t("store.markdownLink")}
						onClick={() =>
							insertDescriptionSnippet("[", "](https://example.com)", "link")
						}
						className="size-9 border border-border rounded flex items-center justify-center hover:bg-muted"
					>
						<LinkIcon size={17} />
					</button>
				<button
					type="button"
					title={t("store.markdownCode")}
					onClick={() => insertDescriptionSnippet("`", "`", "code")}
					className="size-9 border border-border rounded flex items-center justify-center hover:bg-muted"
				>
					<Code2Icon size={17} />
				</button>
				<button
					type="button"
					title={t("store.markdownCodeBlock")}
					onClick={() =>
						insertDescriptionSnippet("\n```\n", "\n```\n", "code block")
					}
					className="size-9 border border-border rounded flex items-center justify-center hover:bg-muted"
				>
					<SquareCode size={17} />
				</button>
				<button
					type="button"
					title={t("store.attachDescriptionImage")}
						onClick={() => imageAttachmentRef.current?.click()}
						className="size-9 border border-border rounded flex items-center justify-center hover:bg-muted"
					>
						<ImagePlusIcon size={17} />
					</button>
					<button
						type="button"
						title={t("store.attachDescriptionFile")}
						onClick={() => fileAttachmentRef.current?.click()}
						className="size-9 border border-border rounded flex items-center justify-center hover:bg-muted"
					>
						<PaperclipIcon size={17} />
					</button>
					<input
						ref={imageAttachmentRef}
						type="file"
						accept="image/*"
						onChange={(e) => {
							toast.promise(appendAttachment(e.target.files?.[0]), {
								loading: t("store.uploadingFile"),
							});
							e.target.value = "";
						}}
						hidden
					/>
					<input
						ref={fileAttachmentRef}
						type="file"
						onChange={(e) => {
							toast.promise(appendAttachment(e.target.files?.[0]), {
								loading: t("store.uploadingFile"),
							});
							e.target.value = "";
						}}
						hidden
					/>
				</div>
				<textarea
					ref={descriptionRef}
					name="description"
					onChange={onChangeHandler}
					value={productInfo.description}
					placeholder={t("store.enterProductDescription")}
					rows={10}
					className="w-full max-w-2xl p-2 px-4 outline-none border border-border rounded resize-y font-mono text-sm"
					required
				/>
			</label>
			<div className="flex gap-5">
				<label className="flex flex-col gap-2">
					{t("store.actualPrice")}
					<input
						type="number"
						name="mrp"
						onChange={onChangeHandler}
						value={productInfo.mrp}
						placeholder="0"
						rows={5}
						className="w-full max-w-45 p-2 px-4 outline-none border border-border rounded resize-none"
						required
					/>
				</label>
				<label className="flex flex-col gap-2">
					{t("store.offerPrice")}
					<input
						type="number"
						name="price"
						onChange={onChangeHandler}
						value={productInfo.price}
						placeholder="0"
						rows={5}
						className="w-full max-w-45 p-2 px-4 outline-none border border-border rounded resize-none"
						required
					/>
				</label>
				<label className="flex flex-col gap-2">
					{t("store.stockQuantity")}
					<input
						type="number"
						min="0"
						name="stockQuantity"
						onChange={onChangeHandler}
						value={productInfo.stockQuantity}
						placeholder={t("store.unlimitedStock")}
						className="w-full max-w-45 p-2 px-4 outline-none border border-border rounded resize-none"
					/>
				</label>
			</div>
			<div className="my-6 max-w-2xl rounded-lg border border-border bg-muted p-4">
				<p className="text-foreground font-medium">{t("store.deliveryType")}</p>
				<div className="mt-3 flex flex-wrap gap-3">
					<label className="flex items-center gap-2 rounded border border-border bg-frame px-3 py-2">
						<input
							type="radio"
							name="deliveryType"
							value="physical"
							checked={productInfo.deliveryType === "physical"}
							onChange={onChangeHandler}
						/>
						{t("store.physicalProduct")}
					</label>
					<label className="flex items-center gap-2 rounded border border-border bg-frame px-3 py-2">
						<input
							type="radio"
							name="deliveryType"
							value="digital"
							checked={productInfo.deliveryType === "digital"}
							onChange={onChangeHandler}
						/>
						{t("store.digitalProduct")}
					</label>
				</div>
				{productInfo.deliveryType === "digital" && (
					<div className="mt-4">
						<button
							type="button"
							onClick={() => digitalAssetRef.current?.click()}
							className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm text-accent-foreground hover:brightness-95"
						>
							<DownloadIcon size={16} />
							{t("store.uploadDigitalFile")}
						</button>
						<input
							ref={digitalAssetRef}
							type="file"
							accept="*/*"
							onChange={(e) => {
								toast.promise(uploadDigitalAsset(e.target.files?.[0]), {
									loading: t("store.uploadingFile"),
								});
								e.target.value = "";
							}}
							hidden
						/>
						<p className="mt-2 text-xs text-muted-foreground">
							{productInfo.digitalAssetName || t("store.noDigitalFile")}
						</p>
					</div>
				)}
			</div>
			<select
				onChange={(e) => {
					setProductInfo({
						...productInfo,
						category: e.target.value,
					});
				}}
				value={productInfo.category}
				className="w-full max-w-sm p-2 px-4 my-6 outline-none border border-border rounded"
				required
			>
				<option value="">{t("store.selectCategory")}</option>
				{categories.map((category) => (
					<option key={category.id} value={category.name}>
						{category.name}
					</option>
				))}
			</select>
			<select
				onChange={(e) => {
					setProductInfo({
						...productInfo,
						groupId: e.target.value,
					});
				}}
				value={productInfo.groupId}
				className="w-full max-w-sm p-2 px-4 my-2 outline-none border border-border rounded"
			>
				<option value="">{t("store.selectGroup")}</option>
				{groups.map((group) => (
					<option key={group.id} value={group.id}>
						{group.name}
					</option>
				))}
			</select>
			<br />
			<button
				disabled={loading}
				className="bg-accent text-accent-foreground px-6 mt-7 py-2 hover:brightness-95 rounded transition"
			>
				{t("store.addProductButton")}
			</button>
		</form>
	);
}
