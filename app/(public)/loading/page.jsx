"use client";

import Loading from "@/components/Loading";
import { normalizeInternalRedirect } from "@/lib/redirects.mjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoadingPage() {
	const router = useRouter();

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const url = normalizeInternalRedirect(params.get("nextUrl"), "");

		if (!url) return undefined;
		const timeout = setTimeout(() => {
			router.push(url);
		}, 8000);
		return () => clearTimeout(timeout);
	}, [router]);

	return <Loading />;
}
