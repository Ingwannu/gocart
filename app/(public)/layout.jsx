"use client";
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SiteFrame from "@/components/SiteFrame";

export default function PublicLayout({ children }) {
	return (
		<>
			<SiteFrame />
			<Navbar />
			{/* Clear the fixed floating header (h-20 at top-2.5 / h-16 mobile). */}
			<main className="pt-28 max-[850px]:pt-20">
				<Banner />
				{children}
			</main>
			<Footer />
		</>
	);
}
