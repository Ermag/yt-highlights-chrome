/** Inline SVG icons, shared by the player controls and the settings-menu item. */
const SVG_NS = 'http://www.w3.org/2000/svg';

export const CHEVRON =
	'M24.291,14.276L14.705,4.69c-0.878-0.878-2.317-0.878-3.195,0l-0.8,0.8c-0.878,0.877-0.878,2.316,0,3.194' +
	'L18.024,16l-7.315,7.315c-0.878,0.878-0.878,2.317,0,3.194l0.8,0.8c0.878,0.879,2.317,0.879,3.195,0l9.586-9.587' +
	'c0.472-0.471,0.682-1.103,0.647-1.723C24.973,15.38,24.763,14.748,24.291,14.276z';

export const STAR = 'M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7L12 17.8 5.8 21.5l1.6-7L2 9.8l7.1-.6z';

/** `size` in px for a fixed icon (the menu cell); omit to fill the parent (control buttons). */
export function svgIcon(pathD: string, viewBox: string, size?: number): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('viewBox', viewBox);
	svg.setAttribute('height', size === undefined ? '100%' : String(size));
	svg.setAttribute('width', size === undefined ? '100%' : String(size));

	const path = document.createElementNS(SVG_NS, 'path');
	path.setAttribute('d', pathD);
	path.setAttribute('fill', 'currentColor');
	svg.appendChild(path);
	return svg;
}
