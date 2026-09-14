import { DEFAULT_LOCALE, isLocale, type Locale } from './locales';
import { en, type MessageKey } from './messages/en';
import { it } from './messages/it';
import { es } from './messages/es';
import { de } from './messages/de';
import { fr } from './messages/fr';

const catalogs: Record<Locale, Record<MessageKey, string>> = {
	en: en as Record<MessageKey, string>,
	it,
	es,
	de,
	fr,
};

export type { MessageKey };

export function t(
	locale: Locale,
	key: MessageKey,
	vars?: Record<string, string | number>,
): string {
	const table = catalogs[locale] || catalogs[DEFAULT_LOCALE];
	let text = table[key] ?? catalogs[DEFAULT_LOCALE][key] ?? String(key);
	if (vars) {
		for (const [name, value] of Object.entries(vars)) {
			text = text.replaceAll(`{${name}}`, String(value));
		}
	}
	return text;
}

export function resolveLocale(value: string | undefined | null): Locale {
	return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function placeTypeLabel(locale: Locale, type: string): string {
	const key = `place.${type}` as MessageKey;
	if (key in catalogs.en) return t(locale, key);
	return t(locale, 'place.other');
}

export function transportModeLabel(locale: Locale, mode: string): string {
	const key = `transport.${mode}` as MessageKey;
	if (key in catalogs.en) return t(locale, key);
	return t(locale, 'transport.other');
}
