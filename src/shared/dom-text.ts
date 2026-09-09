/**
 * `element.textContent`, except emoji — which YouTube renders as `<img alt="😀">`
 * inside comments and descriptions — contribute their alt text rather than
 * nothing.
 */
export function readElementText(element: Element | null | undefined): string {
	return element ? collect(element).trim() : '';
}

function collect(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
	if (node instanceof HTMLImageElement) {
		return node.alt || node.getAttribute('aria-label') || '';
	}
	return [...node.childNodes].map(collect).join('');
}
