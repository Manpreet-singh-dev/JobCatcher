export interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const currencies: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "\u20AC", locale: "de-DE" },
  { code: "GBP", name: "British Pound", symbol: "\u00A3", locale: "en-GB" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", locale: "en-CA" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", locale: "en-AU" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", locale: "en-NZ" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", locale: "de-CH" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", locale: "sv-SE" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", locale: "nb-NO" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", locale: "da-DK" },
  { code: "PLN", name: "Polish Zloty", symbol: "z\u0142", locale: "pl-PL" },
  { code: "CZK", name: "Czech Koruna", symbol: "K\u010D", locale: "cs-CZ" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", locale: "hu-HU" },
  { code: "RON", name: "Romanian Leu", symbol: "lei", locale: "ro-RO" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "\u043B\u0432", locale: "bg-BG" },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr", locale: "is-IS" },
  { code: "RUB", name: "Russian Ruble", symbol: "\u20BD", locale: "ru-RU" },
  { code: "TRY", name: "Turkish Lira", symbol: "\u20BA", locale: "tr-TR" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "\u20B4", locale: "uk-UA" },
  { code: "RSD", name: "Serbian Dinar", symbol: "din", locale: "sr-RS" },
  { code: "INR", name: "Indian Rupee", symbol: "\u20B9", locale: "en-IN" },
  { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5", locale: "zh-CN" },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00A5", locale: "ja-JP" },
  { code: "KRW", name: "South Korean Won", symbol: "\u20A9", locale: "ko-KR" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", locale: "en-HK" },
  { code: "TWD", name: "Taiwan Dollar", symbol: "NT$", locale: "zh-TW" },
  { code: "THB", name: "Thai Baht", symbol: "\u0E3F", locale: "th-TH" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", locale: "ms-MY" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", locale: "id-ID" },
  { code: "PHP", name: "Philippine Peso", symbol: "\u20B1", locale: "en-PH" },
  { code: "VND", name: "Vietnamese Dong", symbol: "\u20AB", locale: "vi-VN" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "\u09F3", locale: "bn-BD" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "\u20A8", locale: "en-PK" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", locale: "si-LK" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "\u20A8", locale: "ne-NP" },
  { code: "AED", name: "UAE Dirham", symbol: "AED", locale: "ar-AE" },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR", locale: "ar-SA" },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR", locale: "ar-QA" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD", locale: "ar-BH" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", locale: "ar-KW" },
  { code: "OMR", name: "Omani Rial", symbol: "OMR", locale: "ar-OM" },
  { code: "ILS", name: "Israeli Shekel", symbol: "\u20AA", locale: "he-IL" },
  { code: "JOD", name: "Jordanian Dinar", symbol: "JD", locale: "ar-JO" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", locale: "pt-BR" },
  { code: "ARS", name: "Argentine Peso", symbol: "AR$", locale: "es-AR" },
  { code: "CLP", name: "Chilean Peso", symbol: "CL$", locale: "es-CL" },
  { code: "COP", name: "Colombian Peso", symbol: "CO$", locale: "es-CO" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", locale: "es-PE" },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$U", locale: "es-UY" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", locale: "es-MX" },
  { code: "ZAR", name: "South African Rand", symbol: "R", locale: "en-ZA" },
  { code: "NGN", name: "Nigerian Naira", symbol: "\u20A6", locale: "en-NG" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", locale: "en-KE" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E\u00A3", locale: "ar-EG" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH\u20B5", locale: "en-GH" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD", locale: "ar-MA" },
  { code: "TND", name: "Tunisian Dinar", symbol: "DT", locale: "ar-TN" },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br", locale: "am-ET" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", locale: "sw-TZ" },
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw", locale: "rw-RW" },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", locale: "fr-SN" },
  { code: "MUR", name: "Mauritian Rupee", symbol: "\u20A8", locale: "en-MU" },
  { code: "VES", name: "Venezuelan Bolivar", symbol: "Bs", locale: "es-VE" },
];

export function getCurrencyByCode(code: string): Currency | undefined {
  return currencies.find((c) => c.code === code);
}

export function searchCurrencies(query: string): Currency[] {
  const q = query.toLowerCase();
  return currencies.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
  );
}

export function formatCurrencyLabel(c: Currency): string {
  return `${c.code} - ${c.name} (${c.symbol})`;
}

export function formatMoney(
  amount: number,
  currencyCode: string = "USD",
): string {
  const curr = getCurrencyByCode(currencyCode);
  const locale = curr?.locale || "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`;
  }
}
