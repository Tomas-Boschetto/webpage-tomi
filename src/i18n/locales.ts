export const LOCALES = ['en', 'it', 'es', 'de', 'fr'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const CONTENT_LOCALES = LOCALES.filter((l) => l !== 'en') as Exclude<Locale, 'en'>[];

export const LOCALE_LABELS: Record<Locale, string> = {
	en: 'English',
	it: 'Italiano',
	es: 'Español',
	de: 'Deutsch',
	fr: 'Français',
};

/** Open Graph locale tags */
export const OG_LOCALE: Record<Locale, string> = {
	en: 'en_US',
	it: 'it_IT',
	es: 'es_ES',
	de: 'de_DE',
	fr: 'fr_FR',
};

export function isLocale(value: string | undefined | null): value is Locale {
	return !!value && (LOCALES as readonly string[]).includes(value);
}

export function stripLocalePrefix(pathname: string): string {
	const parts = pathname.replace(/\/+$/, '') || '/';
	const seg = parts.split('/').filter(Boolean)[0];
	if (seg && isLocale(seg) && seg !== DEFAULT_LOCALE) {
		const rest = parts.slice(seg.length + 1) || '/';
		return rest.startsWith('/') ? rest : `/${rest}`;
	}
	return parts === '' ? '/' : parts;
}

/** Path without locale prefix, preserving query string handling by caller. */
export function localizedPath(locale: Locale, path: string): string {
	const clean = path.startsWith('/') ? path : `/${path}`;
	if (locale === DEFAULT_LOCALE) return clean === '' ? '/' : clean;
	if (clean === '/') return `/${locale}`;
	return `/${locale}${clean}`;
}
