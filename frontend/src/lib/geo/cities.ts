export interface City {
  name: string;
  country: string;
  region?: string;
}

const citiesByCountry: Record<string, City[]> = {
  US: [
    { name: "New York", country: "US", region: "NY" },
    { name: "San Francisco", country: "US", region: "CA" },
    { name: "Los Angeles", country: "US", region: "CA" },
    { name: "Seattle", country: "US", region: "WA" },
    { name: "Austin", country: "US", region: "TX" },
    { name: "Chicago", country: "US", region: "IL" },
    { name: "Boston", country: "US", region: "MA" },
    { name: "Denver", country: "US", region: "CO" },
    { name: "Atlanta", country: "US", region: "GA" },
    { name: "Miami", country: "US", region: "FL" },
    { name: "Washington D.C.", country: "US", region: "DC" },
    { name: "Dallas", country: "US", region: "TX" },
    { name: "Houston", country: "US", region: "TX" },
    { name: "Phoenix", country: "US", region: "AZ" },
    { name: "San Diego", country: "US", region: "CA" },
    { name: "Portland", country: "US", region: "OR" },
    { name: "Minneapolis", country: "US", region: "MN" },
    { name: "San Jose", country: "US", region: "CA" },
    { name: "Raleigh", country: "US", region: "NC" },
    { name: "Nashville", country: "US", region: "TN" },
    { name: "Salt Lake City", country: "US", region: "UT" },
    { name: "Pittsburgh", country: "US", region: "PA" },
    { name: "Detroit", country: "US", region: "MI" },
    { name: "Philadelphia", country: "US", region: "PA" },
  ],
  CA: [
    { name: "Toronto", country: "CA", region: "ON" },
    { name: "Vancouver", country: "CA", region: "BC" },
    { name: "Montreal", country: "CA", region: "QC" },
    { name: "Ottawa", country: "CA", region: "ON" },
    { name: "Calgary", country: "CA", region: "AB" },
    { name: "Edmonton", country: "CA", region: "AB" },
    { name: "Waterloo", country: "CA", region: "ON" },
    { name: "Winnipeg", country: "CA", region: "MB" },
    { name: "Halifax", country: "CA", region: "NS" },
    { name: "Victoria", country: "CA", region: "BC" },
  ],
  MX: [
    { name: "Mexico City", country: "MX" },
    { name: "Guadalajara", country: "MX" },
    { name: "Monterrey", country: "MX" },
    { name: "Puebla", country: "MX" },
    { name: "Tijuana", country: "MX" },
    { name: "Queretaro", country: "MX" },
  ],
  GB: [
    { name: "London", country: "GB" },
    { name: "Manchester", country: "GB" },
    { name: "Birmingham", country: "GB" },
    { name: "Edinburgh", country: "GB" },
    { name: "Glasgow", country: "GB" },
    { name: "Bristol", country: "GB" },
    { name: "Leeds", country: "GB" },
    { name: "Cambridge", country: "GB" },
    { name: "Oxford", country: "GB" },
    { name: "Liverpool", country: "GB" },
    { name: "Belfast", country: "GB" },
    { name: "Cardiff", country: "GB" },
  ],
  DE: [
    { name: "Berlin", country: "DE" },
    { name: "Munich", country: "DE" },
    { name: "Hamburg", country: "DE" },
    { name: "Frankfurt", country: "DE" },
    { name: "Cologne", country: "DE" },
    { name: "Stuttgart", country: "DE" },
    { name: "Dusseldorf", country: "DE" },
    { name: "Leipzig", country: "DE" },
    { name: "Dresden", country: "DE" },
    { name: "Hannover", country: "DE" },
  ],
  FR: [
    { name: "Paris", country: "FR" },
    { name: "Lyon", country: "FR" },
    { name: "Marseille", country: "FR" },
    { name: "Toulouse", country: "FR" },
    { name: "Nice", country: "FR" },
    { name: "Nantes", country: "FR" },
    { name: "Bordeaux", country: "FR" },
    { name: "Strasbourg", country: "FR" },
    { name: "Lille", country: "FR" },
  ],
  NL: [
    { name: "Amsterdam", country: "NL" },
    { name: "Rotterdam", country: "NL" },
    { name: "The Hague", country: "NL" },
    { name: "Utrecht", country: "NL" },
    { name: "Eindhoven", country: "NL" },
    { name: "Groningen", country: "NL" },
  ],
  IE: [
    { name: "Dublin", country: "IE" },
    { name: "Cork", country: "IE" },
    { name: "Galway", country: "IE" },
    { name: "Limerick", country: "IE" },
  ],
  CH: [
    { name: "Zurich", country: "CH" },
    { name: "Geneva", country: "CH" },
    { name: "Basel", country: "CH" },
    { name: "Bern", country: "CH" },
    { name: "Lausanne", country: "CH" },
  ],
  SE: [
    { name: "Stockholm", country: "SE" },
    { name: "Gothenburg", country: "SE" },
    { name: "Malmo", country: "SE" },
    { name: "Uppsala", country: "SE" },
  ],
  NO: [
    { name: "Oslo", country: "NO" },
    { name: "Bergen", country: "NO" },
    { name: "Trondheim", country: "NO" },
    { name: "Stavanger", country: "NO" },
  ],
  DK: [
    { name: "Copenhagen", country: "DK" },
    { name: "Aarhus", country: "DK" },
    { name: "Odense", country: "DK" },
  ],
  FI: [
    { name: "Helsinki", country: "FI" },
    { name: "Espoo", country: "FI" },
    { name: "Tampere", country: "FI" },
    { name: "Oulu", country: "FI" },
  ],
  ES: [
    { name: "Madrid", country: "ES" },
    { name: "Barcelona", country: "ES" },
    { name: "Valencia", country: "ES" },
    { name: "Seville", country: "ES" },
    { name: "Malaga", country: "ES" },
    { name: "Bilbao", country: "ES" },
  ],
  IT: [
    { name: "Milan", country: "IT" },
    { name: "Rome", country: "IT" },
    { name: "Turin", country: "IT" },
    { name: "Florence", country: "IT" },
    { name: "Bologna", country: "IT" },
    { name: "Naples", country: "IT" },
  ],
  PT: [
    { name: "Lisbon", country: "PT" },
    { name: "Porto", country: "PT" },
    { name: "Braga", country: "PT" },
  ],
  PL: [
    { name: "Warsaw", country: "PL" },
    { name: "Krakow", country: "PL" },
    { name: "Wroclaw", country: "PL" },
    { name: "Gdansk", country: "PL" },
    { name: "Poznan", country: "PL" },
    { name: "Lodz", country: "PL" },
    { name: "Katowice", country: "PL" },
  ],
  CZ: [
    { name: "Prague", country: "CZ" },
    { name: "Brno", country: "CZ" },
    { name: "Ostrava", country: "CZ" },
  ],
  AT: [
    { name: "Vienna", country: "AT" },
    { name: "Graz", country: "AT" },
    { name: "Linz", country: "AT" },
    { name: "Salzburg", country: "AT" },
  ],
  RO: [
    { name: "Bucharest", country: "RO" },
    { name: "Cluj-Napoca", country: "RO" },
    { name: "Timisoara", country: "RO" },
    { name: "Iasi", country: "RO" },
  ],
  TR: [
    { name: "Istanbul", country: "TR" },
    { name: "Ankara", country: "TR" },
    { name: "Izmir", country: "TR" },
    { name: "Antalya", country: "TR" },
  ],
  IN: [
    { name: "Bangalore", country: "IN", region: "KA" },
    { name: "Mumbai", country: "IN", region: "MH" },
    { name: "Delhi NCR", country: "IN", region: "DL" },
    { name: "Hyderabad", country: "IN", region: "TS" },
    { name: "Chennai", country: "IN", region: "TN" },
    { name: "Pune", country: "IN", region: "MH" },
    { name: "Kolkata", country: "IN", region: "WB" },
    { name: "Ahmedabad", country: "IN", region: "GJ" },
    { name: "Noida", country: "IN", region: "UP" },
    { name: "Gurugram", country: "IN", region: "HR" },
    { name: "Jaipur", country: "IN", region: "RJ" },
    { name: "Kochi", country: "IN", region: "KL" },
    { name: "Chandigarh", country: "IN", region: "CH" },
    { name: "Indore", country: "IN", region: "MP" },
    { name: "Coimbatore", country: "IN", region: "TN" },
    { name: "Thiruvananthapuram", country: "IN", region: "KL" },
  ],
  CN: [
    { name: "Beijing", country: "CN" },
    { name: "Shanghai", country: "CN" },
    { name: "Shenzhen", country: "CN" },
    { name: "Guangzhou", country: "CN" },
    { name: "Hangzhou", country: "CN" },
    { name: "Chengdu", country: "CN" },
    { name: "Nanjing", country: "CN" },
    { name: "Wuhan", country: "CN" },
    { name: "Suzhou", country: "CN" },
    { name: "Xi'an", country: "CN" },
  ],
  JP: [
    { name: "Tokyo", country: "JP" },
    { name: "Osaka", country: "JP" },
    { name: "Yokohama", country: "JP" },
    { name: "Nagoya", country: "JP" },
    { name: "Fukuoka", country: "JP" },
    { name: "Kyoto", country: "JP" },
    { name: "Sapporo", country: "JP" },
  ],
  KR: [
    { name: "Seoul", country: "KR" },
    { name: "Busan", country: "KR" },
    { name: "Incheon", country: "KR" },
    { name: "Daejeon", country: "KR" },
    { name: "Seongnam", country: "KR" },
  ],
  SG: [
    { name: "Singapore", country: "SG" },
  ],
  HK: [
    { name: "Hong Kong", country: "HK" },
  ],
  TW: [
    { name: "Taipei", country: "TW" },
    { name: "Taichung", country: "TW" },
    { name: "Kaohsiung", country: "TW" },
    { name: "Hsinchu", country: "TW" },
  ],
  ID: [
    { name: "Jakarta", country: "ID" },
    { name: "Bandung", country: "ID" },
    { name: "Surabaya", country: "ID" },
    { name: "Bali", country: "ID" },
    { name: "Yogyakarta", country: "ID" },
  ],
  TH: [
    { name: "Bangkok", country: "TH" },
    { name: "Chiang Mai", country: "TH" },
    { name: "Phuket", country: "TH" },
  ],
  VN: [
    { name: "Ho Chi Minh City", country: "VN" },
    { name: "Hanoi", country: "VN" },
    { name: "Da Nang", country: "VN" },
  ],
  MY: [
    { name: "Kuala Lumpur", country: "MY" },
    { name: "Penang", country: "MY" },
    { name: "Johor Bahru", country: "MY" },
    { name: "Cyberjaya", country: "MY" },
  ],
  PH: [
    { name: "Manila", country: "PH" },
    { name: "Cebu", country: "PH" },
    { name: "Makati", country: "PH" },
    { name: "Quezon City", country: "PH" },
  ],
  BD: [
    { name: "Dhaka", country: "BD" },
    { name: "Chittagong", country: "BD" },
  ],
  PK: [
    { name: "Karachi", country: "PK" },
    { name: "Lahore", country: "PK" },
    { name: "Islamabad", country: "PK" },
    { name: "Rawalpindi", country: "PK" },
  ],
  LK: [
    { name: "Colombo", country: "LK" },
    { name: "Kandy", country: "LK" },
  ],
  AE: [
    { name: "Dubai", country: "AE" },
    { name: "Abu Dhabi", country: "AE" },
    { name: "Sharjah", country: "AE" },
  ],
  SA: [
    { name: "Riyadh", country: "SA" },
    { name: "Jeddah", country: "SA" },
    { name: "Dammam", country: "SA" },
    { name: "NEOM", country: "SA" },
  ],
  QA: [
    { name: "Doha", country: "QA" },
  ],
  IL: [
    { name: "Tel Aviv", country: "IL" },
    { name: "Jerusalem", country: "IL" },
    { name: "Haifa", country: "IL" },
    { name: "Herzliya", country: "IL" },
  ],
  AU: [
    { name: "Sydney", country: "AU", region: "NSW" },
    { name: "Melbourne", country: "AU", region: "VIC" },
    { name: "Brisbane", country: "AU", region: "QLD" },
    { name: "Perth", country: "AU", region: "WA" },
    { name: "Adelaide", country: "AU", region: "SA" },
    { name: "Canberra", country: "AU", region: "ACT" },
    { name: "Gold Coast", country: "AU", region: "QLD" },
  ],
  NZ: [
    { name: "Auckland", country: "NZ" },
    { name: "Wellington", country: "NZ" },
    { name: "Christchurch", country: "NZ" },
  ],
  BR: [
    { name: "Sao Paulo", country: "BR" },
    { name: "Rio de Janeiro", country: "BR" },
    { name: "Brasilia", country: "BR" },
    { name: "Belo Horizonte", country: "BR" },
    { name: "Curitiba", country: "BR" },
    { name: "Porto Alegre", country: "BR" },
    { name: "Recife", country: "BR" },
    { name: "Florianopolis", country: "BR" },
  ],
  AR: [
    { name: "Buenos Aires", country: "AR" },
    { name: "Cordoba", country: "AR" },
    { name: "Rosario", country: "AR" },
    { name: "Mendoza", country: "AR" },
  ],
  CL: [
    { name: "Santiago", country: "CL" },
    { name: "Valparaiso", country: "CL" },
    { name: "Concepcion", country: "CL" },
  ],
  CO: [
    { name: "Bogota", country: "CO" },
    { name: "Medellin", country: "CO" },
    { name: "Cali", country: "CO" },
    { name: "Barranquilla", country: "CO" },
  ],
  ZA: [
    { name: "Cape Town", country: "ZA" },
    { name: "Johannesburg", country: "ZA" },
    { name: "Durban", country: "ZA" },
    { name: "Pretoria", country: "ZA" },
  ],
  NG: [
    { name: "Lagos", country: "NG" },
    { name: "Abuja", country: "NG" },
    { name: "Port Harcourt", country: "NG" },
    { name: "Ibadan", country: "NG" },
  ],
  KE: [
    { name: "Nairobi", country: "KE" },
    { name: "Mombasa", country: "KE" },
  ],
  EG: [
    { name: "Cairo", country: "EG" },
    { name: "Alexandria", country: "EG" },
    { name: "Giza", country: "EG" },
  ],
  GH: [
    { name: "Accra", country: "GH" },
    { name: "Kumasi", country: "GH" },
  ],
  RU: [
    { name: "Moscow", country: "RU" },
    { name: "Saint Petersburg", country: "RU" },
    { name: "Novosibirsk", country: "RU" },
    { name: "Kazan", country: "RU" },
  ],
  UA: [
    { name: "Kyiv", country: "UA" },
    { name: "Lviv", country: "UA" },
    { name: "Kharkiv", country: "UA" },
    { name: "Dnipro", country: "UA" },
    { name: "Odesa", country: "UA" },
  ],
  BE: [
    { name: "Brussels", country: "BE" },
    { name: "Antwerp", country: "BE" },
    { name: "Ghent", country: "BE" },
  ],
  HU: [
    { name: "Budapest", country: "HU" },
    { name: "Debrecen", country: "HU" },
  ],
  GR: [
    { name: "Athens", country: "GR" },
    { name: "Thessaloniki", country: "GR" },
  ],
  BG: [
    { name: "Sofia", country: "BG" },
    { name: "Plovdiv", country: "BG" },
  ],
  HR: [
    { name: "Zagreb", country: "HR" },
    { name: "Split", country: "HR" },
  ],
  RS: [
    { name: "Belgrade", country: "RS" },
    { name: "Novi Sad", country: "RS" },
  ],
  EE: [
    { name: "Tallinn", country: "EE" },
    { name: "Tartu", country: "EE" },
  ],
  LT: [
    { name: "Vilnius", country: "LT" },
    { name: "Kaunas", country: "LT" },
  ],
  LV: [
    { name: "Riga", country: "LV" },
  ],
  SK: [
    { name: "Bratislava", country: "SK" },
    { name: "Kosice", country: "SK" },
  ],
  SI: [
    { name: "Ljubljana", country: "SI" },
    { name: "Maribor", country: "SI" },
  ],
  IS: [
    { name: "Reykjavik", country: "IS" },
  ],
  LU: [
    { name: "Luxembourg City", country: "LU" },
  ],
  NP: [
    { name: "Kathmandu", country: "NP" },
    { name: "Pokhara", country: "NP" },
  ],
  PE: [
    { name: "Lima", country: "PE" },
    { name: "Arequipa", country: "PE" },
  ],
  MA: [
    { name: "Casablanca", country: "MA" },
    { name: "Rabat", country: "MA" },
    { name: "Marrakech", country: "MA" },
  ],
  TN: [
    { name: "Tunis", country: "TN" },
  ],
  ET: [
    { name: "Addis Ababa", country: "ET" },
  ],
  RW: [
    { name: "Kigali", country: "RW" },
  ],
  JO: [
    { name: "Amman", country: "JO" },
  ],
  KW: [
    { name: "Kuwait City", country: "KW" },
  ],
  BH: [
    { name: "Manama", country: "BH" },
  ],
  OM: [
    { name: "Muscat", country: "OM" },
  ],
  MU: [
    { name: "Port Louis", country: "MU" },
  ],
  SN: [
    { name: "Dakar", country: "SN" },
  ],
  TZ: [
    { name: "Dar es Salaam", country: "TZ" },
  ],
  EC: [
    { name: "Quito", country: "EC" },
    { name: "Guayaquil", country: "EC" },
  ],
  UY: [
    { name: "Montevideo", country: "UY" },
  ],
  VE: [
    { name: "Caracas", country: "VE" },
  ],
};

export function getCitiesByCountry(countryCode: string | string[]): City[] {
  if (Array.isArray(countryCode)) {
    return countryCode.flatMap((code) => citiesByCountry[code] || []);
  }
  return citiesByCountry[countryCode] || [];
}

export function searchCities(query: string, countryCode?: string | string[]): City[] {
  const q = query.toLowerCase();
  let pool: City[];
  if (countryCode) {
    pool = Array.isArray(countryCode)
      ? countryCode.flatMap((code) => citiesByCountry[code] || [])
      : citiesByCountry[countryCode] || [];
  } else {
    pool = Object.values(citiesByCountry).flat();
  }
  return pool.filter((c) => c.name.toLowerCase().includes(q));
}

export function formatCityDisplay(city: City): string {
  return city.region ? `${city.name}, ${city.region}` : city.name;
}

export { citiesByCountry };
