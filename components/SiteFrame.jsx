// Fixed viewport frame + rounded corner cutouts, ported from the saas
// template layout. Purely decorative; hidden under 850px.
const CORNER_PATH =
	"M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z";

function Corner({ position }) {
	return (
		<svg
			className={`site-corner site-corner--${position}`}
			width="50"
			height="50"
			viewBox="0 0 50 50"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<path d={CORNER_PATH} fill="currentColor" />
		</svg>
	);
}

export default function SiteFrame() {
	return (
		<>
			<div className="site-frame site-frame--top" aria-hidden="true" />
			<div className="site-frame site-frame--bottom" aria-hidden="true" />
			<div className="site-frame site-frame--left" aria-hidden="true" />
			<div className="site-frame site-frame--right" aria-hidden="true" />
			<Corner position="top-left" />
			<Corner position="top-right" />
			<Corner position="bottom-left" />
			<Corner position="bottom-right" />
		</>
	);
}
