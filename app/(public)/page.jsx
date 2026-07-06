"use client";
import BestSelling from "@/components/BestSelling";
import FAQ from "@/components/FAQ";
import Hero from "@/components/Hero";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";

export default function Home() {
	return (
		<div>
			<Hero />
			<LatestProducts />
			<BestSelling />
			<OurSpecs />
			<FAQ />
		</div>
	);
}
