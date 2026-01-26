/**
 * Button Component
 * Implements: T025 - Button with VS Code styling
 */

export interface ButtonProps {
	label: string;
	variant?: 'primary' | 'secondary' | 'icon';
	icon?: string;
	onClick?: () => void;
	disabled?: boolean;
	id?: string;
	title?: string;
}

export function Button(props: ButtonProps): string {
	const variant = props.variant || 'primary';
	const disabled = props.disabled || false;
	const id = props.id || '';
	const title = props.title || props.label;

	const classes = ['btn', `btn-${variant}`];
	if (disabled) {
		classes.push('disabled');
	}

	return `
		<button 
			${id ? `id="${id}"` : ''}
			class="${classes.join(' ')}"
			title="${title}"
			${disabled ? 'disabled' : ''}
		>
			${props.icon ? `<span class="icon">${props.icon}</span>` : ''}
			${props.label}
		</button>
	`;
}
