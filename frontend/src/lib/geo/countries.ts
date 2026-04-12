export interface Country {
  code: string;
  name: string;
  flag: string;
  phone: string;
  currency: string;
  continent: string;
}

export const countries: Country[] = [
  // North America
  { code: "US", name: "United States", flag: "\u{1F1FA}\u{1F1F8}", phone: "+1", currency: "USD", continent: "North America" },
  { code: "CA", name: "Canada", flag: "\u{1F1E8}\u{1F1E6}", phone: "+1", currency: "CAD", continent: "North America" },
  { code: "MX", name: "Mexico", flag: "\u{1F1F2}\u{1F1FD}", phone: "+52", currency: "MXN", continent: "North America" },

  // Europe
  { code: "GB", name: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}", phone: "+44", currency: "GBP", continent: "Europe" },
  { code: "DE", name: "Germany", flag: "\u{1F1E9}\u{1F1EA}", phone: "+49", currency: "EUR", continent: "Europe" },
  { code: "FR", name: "France", flag: "\u{1F1EB}\u{1F1F7}", phone: "+33", currency: "EUR", continent: "Europe" },
  { code: "NL", name: "Netherlands", flag: "\u{1F1F3}\u{1F1F1}", phone: "+31", currency: "EUR", continent: "Europe" },
  { code: "IE", name: "Ireland", flag: "\u{1F1EE}\u{1F1EA}", phone: "+353", currency: "EUR", continent: "Europe" },
  { code: "CH", name: "Switzerland", flag: "\u{1F1E8}\u{1F1ED}", phone: "+41", currency: "CHF", continent: "Europe" },
  { code: "SE", name: "Sweden", flag: "\u{1F1F8}\u{1F1EA}", phone: "+46", currency: "SEK", continent: "Europe" },
  { code: "NO", name: "Norway", flag: "\u{1F1F3}\u{1F1F4}", phone: "+47", currency: "NOK", continent: "Europe" },
  { code: "DK", name: "Denmark", flag: "\u{1F1E9}\u{1F1F0}", phone: "+45", currency: "DKK", continent: "Europe" },
  { code: "FI", name: "Finland", flag: "\u{1F1EB}\u{1F1EE}", phone: "+358", currency: "EUR", continent: "Europe" },
  { code: "ES", name: "Spain", flag: "\u{1F1EA}\u{1F1F8}", phone: "+34", currency: "EUR", continent: "Europe" },
  { code: "IT", name: "Italy", flag: "\u{1F1EE}\u{1F1F9}", phone: "+39", currency: "EUR", continent: "Europe" },
  { code: "PT", name: "Portugal", flag: "\u{1F1F5}\u{1F1F9}", phone: "+351", currency: "EUR", continent: "Europe" },
  { code: "PL", name: "Poland", flag: "\u{1F1F5}\u{1F1F1}", phone: "+48", currency: "PLN", continent: "Europe" },
  { code: "CZ", name: "Czech Republic", flag: "\u{1F1E8}\u{1F1FF}", phone: "+420", currency: "CZK", continent: "Europe" },
  { code: "AT", name: "Austria", flag: "\u{1F1E6}\u{1F1F9}", phone: "+43", currency: "EUR", continent: "Europe" },
  { code: "BE", name: "Belgium", flag: "\u{1F1E7}\u{1F1EA}", phone: "+32", currency: "EUR", continent: "Europe" },
  { code: "RO", name: "Romania", flag: "\u{1F1F7}\u{1F1F4}", phone: "+40", currency: "RON", continent: "Europe" },
  { code: "HU", name: "Hungary", flag: "\u{1F1ED}\u{1F1FA}", phone: "+36", currency: "HUF", continent: "Europe" },
  { code: "GR", name: "Greece", flag: "\u{1F1EC}\u{1F1F7}", phone: "+30", currency: "EUR", continent: "Europe" },
  { code: "UA", name: "Ukraine", flag: "\u{1F1FA}\u{1F1E6}", phone: "+380", currency: "UAH", continent: "Europe" },
  { code: "BG", name: "Bulgaria", flag: "\u{1F1E7}\u{1F1EC}", phone: "+359", currency: "BGN", continent: "Europe" },
  { code: "HR", name: "Croatia", flag: "\u{1F1ED}\u{1F1F7}", phone: "+385", currency: "EUR", continent: "Europe" },
  { code: "RS", name: "Serbia", flag: "\u{1F1F7}\u{1F1F8}", phone: "+381", currency: "RSD", continent: "Europe" },
  { code: "LT", name: "Lithuania", flag: "\u{1F1F1}\u{1F1F9}", phone: "+370", currency: "EUR", continent: "Europe" },
  { code: "LV", name: "Latvia", flag: "\u{1F1F1}\u{1F1FB}", phone: "+371", currency: "EUR", continent: "Europe" },
  { code: "EE", name: "Estonia", flag: "\u{1F1EA}\u{1F1EA}", phone: "+372", currency: "EUR", continent: "Europe" },
  { code: "IS", name: "Iceland", flag: "\u{1F1EE}\u{1F1F8}", phone: "+354", currency: "ISK", continent: "Europe" },
  { code: "LU", name: "Luxembourg", flag: "\u{1F1F1}\u{1F1FA}", phone: "+352", currency: "EUR", continent: "Europe" },
  { code: "SK", name: "Slovakia", flag: "\u{1F1F8}\u{1F1F0}", phone: "+421", currency: "EUR", continent: "Europe" },
  { code: "SI", name: "Slovenia", flag: "\u{1F1F8}\u{1F1EE}", phone: "+386", currency: "EUR", continent: "Europe" },
  { code: "RU", name: "Russia", flag: "\u{1F1F7}\u{1F1FA}", phone: "+7", currency: "RUB", continent: "Europe" },
  { code: "TR", name: "Turkey", flag: "\u{1F1F9}\u{1F1F7}", phone: "+90", currency: "TRY", continent: "Europe" },

  // Asia
  { code: "IN", name: "India", flag: "\u{1F1EE}\u{1F1F3}", phone: "+91", currency: "INR", continent: "Asia" },
  { code: "CN", name: "China", flag: "\u{1F1E8}\u{1F1F3}", phone: "+86", currency: "CNY", continent: "Asia" },
  { code: "JP", name: "Japan", flag: "\u{1F1EF}\u{1F1F5}", phone: "+81", currency: "JPY", continent: "Asia" },
  { code: "KR", name: "South Korea", flag: "\u{1F1F0}\u{1F1F7}", phone: "+82", currency: "KRW", continent: "Asia" },
  { code: "SG", name: "Singapore", flag: "\u{1F1F8}\u{1F1EC}", phone: "+65", currency: "SGD", continent: "Asia" },
  { code: "HK", name: "Hong Kong", flag: "\u{1F1ED}\u{1F1F0}", phone: "+852", currency: "HKD", continent: "Asia" },
  { code: "TW", name: "Taiwan", flag: "\u{1F1F9}\u{1F1FC}", phone: "+886", currency: "TWD", continent: "Asia" },
  { code: "ID", name: "Indonesia", flag: "\u{1F1EE}\u{1F1E9}", phone: "+62", currency: "IDR", continent: "Asia" },
  { code: "TH", name: "Thailand", flag: "\u{1F1F9}\u{1F1ED}", phone: "+66", currency: "THB", continent: "Asia" },
  { code: "VN", name: "Vietnam", flag: "\u{1F1FB}\u{1F1F3}", phone: "+84", currency: "VND", continent: "Asia" },
  { code: "MY", name: "Malaysia", flag: "\u{1F1F2}\u{1F1FE}", phone: "+60", currency: "MYR", continent: "Asia" },
  { code: "PH", name: "Philippines", flag: "\u{1F1F5}\u{1F1ED}", phone: "+63", currency: "PHP", continent: "Asia" },
  { code: "BD", name: "Bangladesh", flag: "\u{1F1E7}\u{1F1E9}", phone: "+880", currency: "BDT", continent: "Asia" },
  { code: "PK", name: "Pakistan", flag: "\u{1F1F5}\u{1F1F0}", phone: "+92", currency: "PKR", continent: "Asia" },
  { code: "LK", name: "Sri Lanka", flag: "\u{1F1F1}\u{1F1F0}", phone: "+94", currency: "LKR", continent: "Asia" },
  { code: "NP", name: "Nepal", flag: "\u{1F1F3}\u{1F1F5}", phone: "+977", currency: "NPR", continent: "Asia" },

  // Middle East
  { code: "AE", name: "United Arab Emirates", flag: "\u{1F1E6}\u{1F1EA}", phone: "+971", currency: "AED", continent: "Asia" },
  { code: "SA", name: "Saudi Arabia", flag: "\u{1F1F8}\u{1F1E6}", phone: "+966", currency: "SAR", continent: "Asia" },
  { code: "QA", name: "Qatar", flag: "\u{1F1F6}\u{1F1E6}", phone: "+974", currency: "QAR", continent: "Asia" },
  { code: "BH", name: "Bahrain", flag: "\u{1F1E7}\u{1F1ED}", phone: "+973", currency: "BHD", continent: "Asia" },
  { code: "KW", name: "Kuwait", flag: "\u{1F1F0}\u{1F1FC}", phone: "+965", currency: "KWD", continent: "Asia" },
  { code: "OM", name: "Oman", flag: "\u{1F1F4}\u{1F1F2}", phone: "+968", currency: "OMR", continent: "Asia" },
  { code: "IL", name: "Israel", flag: "\u{1F1EE}\u{1F1F1}", phone: "+972", currency: "ILS", continent: "Asia" },
  { code: "JO", name: "Jordan", flag: "\u{1F1EF}\u{1F1F4}", phone: "+962", currency: "JOD", continent: "Asia" },

  // Oceania
  { code: "AU", name: "Australia", flag: "\u{1F1E6}\u{1F1FA}", phone: "+61", currency: "AUD", continent: "Oceania" },
  { code: "NZ", name: "New Zealand", flag: "\u{1F1F3}\u{1F1FF}", phone: "+64", currency: "NZD", continent: "Oceania" },

  // South America
  { code: "BR", name: "Brazil", flag: "\u{1F1E7}\u{1F1F7}", phone: "+55", currency: "BRL", continent: "South America" },
  { code: "AR", name: "Argentina", flag: "\u{1F1E6}\u{1F1F7}", phone: "+54", currency: "ARS", continent: "South America" },
  { code: "CL", name: "Chile", flag: "\u{1F1E8}\u{1F1F1}", phone: "+56", currency: "CLP", continent: "South America" },
  { code: "CO", name: "Colombia", flag: "\u{1F1E8}\u{1F1F4}", phone: "+57", currency: "COP", continent: "South America" },
  { code: "PE", name: "Peru", flag: "\u{1F1F5}\u{1F1EA}", phone: "+51", currency: "PEN", continent: "South America" },
  { code: "UY", name: "Uruguay", flag: "\u{1F1FA}\u{1F1FE}", phone: "+598", currency: "UYU", continent: "South America" },
  { code: "EC", name: "Ecuador", flag: "\u{1F1EA}\u{1F1E8}", phone: "+593", currency: "USD", continent: "South America" },
  { code: "VE", name: "Venezuela", flag: "\u{1F1FB}\u{1F1EA}", phone: "+58", currency: "VES", continent: "South America" },

  // Africa
  { code: "ZA", name: "South Africa", flag: "\u{1F1FF}\u{1F1E6}", phone: "+27", currency: "ZAR", continent: "Africa" },
  { code: "NG", name: "Nigeria", flag: "\u{1F1F3}\u{1F1EC}", phone: "+234", currency: "NGN", continent: "Africa" },
  { code: "KE", name: "Kenya", flag: "\u{1F1F0}\u{1F1EA}", phone: "+254", currency: "KES", continent: "Africa" },
  { code: "EG", name: "Egypt", flag: "\u{1F1EA}\u{1F1EC}", phone: "+20", currency: "EGP", continent: "Africa" },
  { code: "GH", name: "Ghana", flag: "\u{1F1EC}\u{1F1ED}", phone: "+233", currency: "GHS", continent: "Africa" },
  { code: "MA", name: "Morocco", flag: "\u{1F1F2}\u{1F1E6}", phone: "+212", currency: "MAD", continent: "Africa" },
  { code: "TN", name: "Tunisia", flag: "\u{1F1F9}\u{1F1F3}", phone: "+216", currency: "TND", continent: "Africa" },
  { code: "ET", name: "Ethiopia", flag: "\u{1F1EA}\u{1F1F9}", phone: "+251", currency: "ETB", continent: "Africa" },
  { code: "TZ", name: "Tanzania", flag: "\u{1F1F9}\u{1F1FF}", phone: "+255", currency: "TZS", continent: "Africa" },
  { code: "RW", name: "Rwanda", flag: "\u{1F1F7}\u{1F1FC}", phone: "+250", currency: "RWF", continent: "Africa" },
  { code: "SN", name: "Senegal", flag: "\u{1F1F8}\u{1F1F3}", phone: "+221", currency: "XOF", continent: "Africa" },
  { code: "MU", name: "Mauritius", flag: "\u{1F1F2}\u{1F1FA}", phone: "+230", currency: "MUR", continent: "Africa" },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function getCountriesByContinent(continent: string): Country[] {
  return countries.filter((c) => c.continent === continent);
}

export function searchCountries(query: string): Country[] {
  const q = query.toLowerCase();
  return countries.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
  );
}

export const continents = [
  "North America",
  "Europe",
  "Asia",
  "Oceania",
  "South America",
  "Africa",
];
