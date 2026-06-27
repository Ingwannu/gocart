import en from "./en";
import ko from "./ko";

export const dictionaries = { en, ko };
export const defaultLocale = "ko";
export const locales = ["ko", "en"];

export function getDictionary(locale) {
	return dictionaries[locale] || dictionaries[defaultLocale];
}
