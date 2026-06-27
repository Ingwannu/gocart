const allowedTags = new Set([
	"a",
	"blockquote",
	"br",
	"code",
	"div",
	"em",
	"h2",
	"h3",
	"h4",
	"hr",
	"i",
	"img",
	"li",
	"ol",
	"p",
	"pre",
	"span",
	"strong",
	"table",
	"tbody",
	"td",
	"th",
	"thead",
	"tr",
	"u",
	"ul",
]);

const allowedStyleProperties = new Set([
	"background-color",
	"border",
	"border-radius",
	"color",
	"display",
	"font-size",
	"font-style",
	"font-weight",
	"margin",
	"margin-bottom",
	"margin-top",
	"padding",
	"text-align",
	"text-decoration",
]);

function escapeHtml(value) {
	return String(value || "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function isSafeUrl(value) {
	const url = String(value || "").trim();
	return /^(https?:|\/uploads\/|data:image\/|data:application\/pdf|data:text\/plain|data:application\/octet-stream)/i.test(
		url,
	);
}

function sanitizeStyle(value) {
	return String(value || "")
		.split(";")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [rawName, ...rawValue] = entry.split(":");
			const name = rawName?.trim().toLowerCase();
			const styleValue = rawValue.join(":").trim();
			if (!allowedStyleProperties.has(name)) return "";
			if (/expression|javascript:|url\s*\(/i.test(styleValue)) return "";
			return `${name}: ${styleValue}`;
		})
		.filter(Boolean)
		.join("; ");
}

function sanitizeAttributes(tagName, rawAttributes) {
	const attributes = [];
	const attrPattern = /([a-zA-Z:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
	let match;

	while ((match = attrPattern.exec(rawAttributes || ""))) {
		const name = match[1].toLowerCase();
		const value = match[3] ?? match[4] ?? match[5] ?? "";
		if (name.startsWith("on")) continue;
		if (name === "style") {
			const style = sanitizeStyle(value);
			if (style) attributes.push(`style="${escapeHtml(style)}"`);
			continue;
		}
		if (tagName === "a" && name === "href" && isSafeUrl(value)) {
			attributes.push(`href="${escapeHtml(value)}"`);
			attributes.push('target="_blank"');
			attributes.push('rel="noopener noreferrer"');
			continue;
		}
		if (tagName === "img" && name === "src" && isSafeUrl(value)) {
			attributes.push(`src="${escapeHtml(value)}"`);
			continue;
		}
		if (["alt", "title", "colspan", "rowspan"].includes(name)) {
			attributes.push(`${name}="${escapeHtml(value)}"`);
		}
	}

	return attributes.length ? ` ${attributes.join(" ")}` : "";
}

function sanitizeHtml(html) {
	return String(html || "")
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g, (full, tag, attrs) => {
			const tagName = tag.toLowerCase();
			if (!allowedTags.has(tagName)) return "";
			if (full.startsWith("</")) return `</${tagName}>`;
			return `<${tagName}${sanitizeAttributes(tagName, attrs)}>`;
		});
}

function renderInlineMarkdown(value) {
	let html = escapeHtml(value);
	html = html.replace(
		/!\[([^\]]*)\]\(([^)\s]+)\)/g,
		(_match, alt, src) =>
			isSafeUrl(src) ? `<img alt="${escapeHtml(alt)}" src="${escapeHtml(src)}">` : "",
	);
	html = html.replace(
		/\[([^\]]+)\]\(([^)\s]+)\)/g,
		(_match, text, href) =>
			isSafeUrl(href)
				? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`
				: escapeHtml(text),
	);
	html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
	html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
	return html;
}

function renderMarkdownBlocks(markdown) {
	const blocks = [];
	const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];
		const trimmed = line.trim();
		if (!trimmed) {
			index += 1;
			continue;
		}

		if (trimmed.startsWith("```")) {
			const codeLines = [];
			index += 1;
			while (index < lines.length && !lines[index].trim().startsWith("```")) {
				codeLines.push(lines[index]);
				index += 1;
			}
			index += 1;
			blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
			continue;
		}

		const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
		if (heading) {
			const level = heading[1].length;
			blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
			index += 1;
			continue;
		}

		if (/^[-*]\s+/.test(trimmed)) {
			const items = [];
			while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
				items.push(`<li>${renderInlineMarkdown(lines[index].trim().slice(2))}</li>`);
				index += 1;
			}
			blocks.push(`<ul>${items.join("")}</ul>`);
			continue;
		}

		if (/^\d+\.\s+/.test(trimmed)) {
			const items = [];
			while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
				items.push(
					`<li>${renderInlineMarkdown(lines[index].trim().replace(/^\d+\.\s+/, ""))}</li>`,
				);
				index += 1;
			}
			blocks.push(`<ol>${items.join("")}</ol>`);
			continue;
		}

		if (trimmed.startsWith("<")) {
			blocks.push(trimmed);
			index += 1;
			continue;
		}

		const paragraphLines = [];
		while (index < lines.length && lines[index].trim()) {
			paragraphLines.push(lines[index].trim());
			index += 1;
		}
		blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join(" "))}</p>`);
	}

	return blocks.join("\n");
}

export function renderRichDescription(description) {
	return sanitizeHtml(renderMarkdownBlocks(description));
}

export function appendDescriptionAsset(description, fileAsset) {
	const name = fileAsset?.name || "attachment";
	const url = fileAsset?.url || fileAsset?.dataUrl || "";
	const type = fileAsset?.type || "";
	const attachment = type.startsWith("image/")
		? `![${name}](${url})`
		: `[${name}](${url})`;
	return `${String(description || "").trimEnd()}\n\n${attachment}`.trimStart();
}

export function plainRichDescription(description) {
	return renderRichDescription(description)
		.replace(/<[^>]+>/g, " ")
		.replace(/&lt;\/?[^&]+?&gt;/g, " ")
		.replaceAll("&amp;", "&")
		.replaceAll("&quot;", '"')
		.replace(/\s+/g, " ")
		.trim();
}
