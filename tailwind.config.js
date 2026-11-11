/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['DM Sans', 'Aptos', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				display: ['Instrument Serif', 'Georgia', 'serif'],
				mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
			},
			colors: {
				accent: {
					DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
					soft: 'rgb(var(--accent) / 0.12)'
				}
			},
			borderRadius: {
				'4xl': '2rem'
			},
			animation: {
				'fade-up': 'fadeUp .5s cubic-bezier(.22,1,.36,1) both',
				'fade-in': 'fadeIn .35s ease both',
				'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
				'spin-slow': 'spin 2s linear infinite'
			},
			keyframes: {
				fadeUp: {
					from: { opacity: '0', transform: 'translateY(14px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				fadeIn: {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				pulseSoft: {
					'0%, 100%': { opacity: '0.55' },
					'50%': { opacity: '1' }
				}
			}
		}
	},
	plugins: []
};
