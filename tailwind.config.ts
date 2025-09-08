import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				edit: {
					hero: 'hsl(var(--edit-hero))',
					villain: 'hsl(var(--edit-villain))',
					underedited: 'hsl(var(--edit-underedited))',
					ghosted: 'hsl(var(--edit-ghosted))',
					comic: 'hsl(var(--edit-comic))',
					darkhorse: 'hsl(var(--edit-darkhorse))',
					mastermind: 'hsl(var(--edit-mastermind))',
					'puppet-master': 'hsl(var(--edit-puppet-master))',
					strategic: 'hsl(var(--edit-strategic))',
					antagonist: 'hsl(var(--edit-antagonist))',
					troublemaker: 'hsl(var(--edit-troublemaker))',
					flirt: 'hsl(var(--edit-flirt))',
					gossip: 'hsl(var(--edit-gossip))',
					social: 'hsl(var(--edit-social))',
					floater: 'hsl(var(--edit-floater))',
					clown: 'hsl(var(--edit-clown))',
					seducer: 'hsl(var(--edit-seducer))',
					romantic: 'hsl(var(--edit-romantic))',
					'fan-favorite': 'hsl(var(--edit-fan-favorite))',
					pariah: 'hsl(var(--edit-pariah))',
					contender: 'hsl(var(--edit-contender))',
					controversial: 'hsl(var(--edit-controversial))'
				},
				surveillance: {
					active: 'hsl(var(--camera-active))',
					inactive: 'hsl(var(--camera-inactive))',
					confessional: 'hsl(var(--confessional))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
