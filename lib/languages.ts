export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  /** Display label, e.g. "German (Deutsch)". */
  label: string;
}

// Static fallback shown before the full ISO list loads (and if it fails).
export const DEFAULT_LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    label: "English (English)",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    label: "German (Deutsch)",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    label: "Spanish (Español)",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    label: "French (Français)",
  },
];

/**
 * Full ISO 639-1 language list, sorted by English name. Single source used by
 * the filter bar and the submit modal so their labels can't drift (the two once
 * formatted the label differently — "German(Deutsch)" vs "German (Deutsch)").
 */
export async function loadLanguages(): Promise<LanguageOption[]> {
  const ISO6391 = (await import("iso-639-1")).default;
  return ISO6391.getAllCodes()
    .map((code) => {
      const name = ISO6391.getName(code);
      const nativeName = ISO6391.getNativeName(code);
      return { code, name, nativeName, label: `${name} (${nativeName})` };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
