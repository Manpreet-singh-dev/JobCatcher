"""
Static geographic reference data: countries, cities, currencies.
No auth required — public endpoint for dropdowns.
"""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/api/geo", tags=["geo"])

COUNTRIES = [
    {"code": "US", "name": "United States", "phone": "+1", "currency": "USD", "continent": "North America"},
    {"code": "CA", "name": "Canada", "phone": "+1", "currency": "CAD", "continent": "North America"},
    {"code": "MX", "name": "Mexico", "phone": "+52", "currency": "MXN", "continent": "North America"},
    {"code": "GB", "name": "United Kingdom", "phone": "+44", "currency": "GBP", "continent": "Europe"},
    {"code": "DE", "name": "Germany", "phone": "+49", "currency": "EUR", "continent": "Europe"},
    {"code": "FR", "name": "France", "phone": "+33", "currency": "EUR", "continent": "Europe"},
    {"code": "NL", "name": "Netherlands", "phone": "+31", "currency": "EUR", "continent": "Europe"},
    {"code": "IE", "name": "Ireland", "phone": "+353", "currency": "EUR", "continent": "Europe"},
    {"code": "CH", "name": "Switzerland", "phone": "+41", "currency": "CHF", "continent": "Europe"},
    {"code": "SE", "name": "Sweden", "phone": "+46", "currency": "SEK", "continent": "Europe"},
    {"code": "NO", "name": "Norway", "phone": "+47", "currency": "NOK", "continent": "Europe"},
    {"code": "DK", "name": "Denmark", "phone": "+45", "currency": "DKK", "continent": "Europe"},
    {"code": "FI", "name": "Finland", "phone": "+358", "currency": "EUR", "continent": "Europe"},
    {"code": "ES", "name": "Spain", "phone": "+34", "currency": "EUR", "continent": "Europe"},
    {"code": "IT", "name": "Italy", "phone": "+39", "currency": "EUR", "continent": "Europe"},
    {"code": "PT", "name": "Portugal", "phone": "+351", "currency": "EUR", "continent": "Europe"},
    {"code": "PL", "name": "Poland", "phone": "+48", "currency": "PLN", "continent": "Europe"},
    {"code": "CZ", "name": "Czech Republic", "phone": "+420", "currency": "CZK", "continent": "Europe"},
    {"code": "AT", "name": "Austria", "phone": "+43", "currency": "EUR", "continent": "Europe"},
    {"code": "BE", "name": "Belgium", "phone": "+32", "currency": "EUR", "continent": "Europe"},
    {"code": "RO", "name": "Romania", "phone": "+40", "currency": "RON", "continent": "Europe"},
    {"code": "HU", "name": "Hungary", "phone": "+36", "currency": "HUF", "continent": "Europe"},
    {"code": "GR", "name": "Greece", "phone": "+30", "currency": "EUR", "continent": "Europe"},
    {"code": "UA", "name": "Ukraine", "phone": "+380", "currency": "UAH", "continent": "Europe"},
    {"code": "BG", "name": "Bulgaria", "phone": "+359", "currency": "BGN", "continent": "Europe"},
    {"code": "HR", "name": "Croatia", "phone": "+385", "currency": "EUR", "continent": "Europe"},
    {"code": "RS", "name": "Serbia", "phone": "+381", "currency": "RSD", "continent": "Europe"},
    {"code": "EE", "name": "Estonia", "phone": "+372", "currency": "EUR", "continent": "Europe"},
    {"code": "LT", "name": "Lithuania", "phone": "+370", "currency": "EUR", "continent": "Europe"},
    {"code": "LV", "name": "Latvia", "phone": "+371", "currency": "EUR", "continent": "Europe"},
    {"code": "SK", "name": "Slovakia", "phone": "+421", "currency": "EUR", "continent": "Europe"},
    {"code": "SI", "name": "Slovenia", "phone": "+386", "currency": "EUR", "continent": "Europe"},
    {"code": "IS", "name": "Iceland", "phone": "+354", "currency": "ISK", "continent": "Europe"},
    {"code": "LU", "name": "Luxembourg", "phone": "+352", "currency": "EUR", "continent": "Europe"},
    {"code": "RU", "name": "Russia", "phone": "+7", "currency": "RUB", "continent": "Europe"},
    {"code": "TR", "name": "Turkey", "phone": "+90", "currency": "TRY", "continent": "Europe"},
    {"code": "IN", "name": "India", "phone": "+91", "currency": "INR", "continent": "Asia"},
    {"code": "CN", "name": "China", "phone": "+86", "currency": "CNY", "continent": "Asia"},
    {"code": "JP", "name": "Japan", "phone": "+81", "currency": "JPY", "continent": "Asia"},
    {"code": "KR", "name": "South Korea", "phone": "+82", "currency": "KRW", "continent": "Asia"},
    {"code": "SG", "name": "Singapore", "phone": "+65", "currency": "SGD", "continent": "Asia"},
    {"code": "HK", "name": "Hong Kong", "phone": "+852", "currency": "HKD", "continent": "Asia"},
    {"code": "TW", "name": "Taiwan", "phone": "+886", "currency": "TWD", "continent": "Asia"},
    {"code": "ID", "name": "Indonesia", "phone": "+62", "currency": "IDR", "continent": "Asia"},
    {"code": "TH", "name": "Thailand", "phone": "+66", "currency": "THB", "continent": "Asia"},
    {"code": "VN", "name": "Vietnam", "phone": "+84", "currency": "VND", "continent": "Asia"},
    {"code": "MY", "name": "Malaysia", "phone": "+60", "currency": "MYR", "continent": "Asia"},
    {"code": "PH", "name": "Philippines", "phone": "+63", "currency": "PHP", "continent": "Asia"},
    {"code": "PK", "name": "Pakistan", "phone": "+92", "currency": "PKR", "continent": "Asia"},
    {"code": "BD", "name": "Bangladesh", "phone": "+880", "currency": "BDT", "continent": "Asia"},
    {"code": "LK", "name": "Sri Lanka", "phone": "+94", "currency": "LKR", "continent": "Asia"},
    {"code": "NP", "name": "Nepal", "phone": "+977", "currency": "NPR", "continent": "Asia"},
    {"code": "AE", "name": "United Arab Emirates", "phone": "+971", "currency": "AED", "continent": "Asia"},
    {"code": "SA", "name": "Saudi Arabia", "phone": "+966", "currency": "SAR", "continent": "Asia"},
    {"code": "QA", "name": "Qatar", "phone": "+974", "currency": "QAR", "continent": "Asia"},
    {"code": "IL", "name": "Israel", "phone": "+972", "currency": "ILS", "continent": "Asia"},
    {"code": "AU", "name": "Australia", "phone": "+61", "currency": "AUD", "continent": "Oceania"},
    {"code": "NZ", "name": "New Zealand", "phone": "+64", "currency": "NZD", "continent": "Oceania"},
    {"code": "BR", "name": "Brazil", "phone": "+55", "currency": "BRL", "continent": "South America"},
    {"code": "AR", "name": "Argentina", "phone": "+54", "currency": "ARS", "continent": "South America"},
    {"code": "CL", "name": "Chile", "phone": "+56", "currency": "CLP", "continent": "South America"},
    {"code": "CO", "name": "Colombia", "phone": "+57", "currency": "COP", "continent": "South America"},
    {"code": "MX", "name": "Mexico", "phone": "+52", "currency": "MXN", "continent": "North America"},
    {"code": "ZA", "name": "South Africa", "phone": "+27", "currency": "ZAR", "continent": "Africa"},
    {"code": "NG", "name": "Nigeria", "phone": "+234", "currency": "NGN", "continent": "Africa"},
    {"code": "KE", "name": "Kenya", "phone": "+254", "currency": "KES", "continent": "Africa"},
    {"code": "EG", "name": "Egypt", "phone": "+20", "currency": "EGP", "continent": "Africa"},
    {"code": "GH", "name": "Ghana", "phone": "+233", "currency": "GHS", "continent": "Africa"},
]

CITIES: dict[str, list[dict]] = {
    "US": [
        {"name": "New York", "region": "NY"}, {"name": "San Francisco", "region": "CA"},
        {"name": "Los Angeles", "region": "CA"}, {"name": "Seattle", "region": "WA"},
        {"name": "Austin", "region": "TX"}, {"name": "Chicago", "region": "IL"},
        {"name": "Boston", "region": "MA"}, {"name": "Denver", "region": "CO"},
        {"name": "Atlanta", "region": "GA"}, {"name": "Miami", "region": "FL"},
        {"name": "Washington D.C.", "region": "DC"}, {"name": "Dallas", "region": "TX"},
        {"name": "San Jose", "region": "CA"}, {"name": "Portland", "region": "OR"},
    ],
    "CA": [
        {"name": "Toronto", "region": "ON"}, {"name": "Vancouver", "region": "BC"},
        {"name": "Montreal", "region": "QC"}, {"name": "Ottawa", "region": "ON"},
        {"name": "Calgary", "region": "AB"}, {"name": "Waterloo", "region": "ON"},
    ],
    "GB": [
        {"name": "London"}, {"name": "Manchester"}, {"name": "Birmingham"},
        {"name": "Edinburgh"}, {"name": "Glasgow"}, {"name": "Bristol"},
        {"name": "Cambridge"}, {"name": "Oxford"}, {"name": "Leeds"},
    ],
    "DE": [
        {"name": "Berlin"}, {"name": "Munich"}, {"name": "Hamburg"},
        {"name": "Frankfurt"}, {"name": "Cologne"}, {"name": "Stuttgart"},
    ],
    "FR": [
        {"name": "Paris"}, {"name": "Lyon"}, {"name": "Marseille"},
        {"name": "Toulouse"}, {"name": "Nice"}, {"name": "Bordeaux"},
    ],
    "NL": [{"name": "Amsterdam"}, {"name": "Rotterdam"}, {"name": "Utrecht"}, {"name": "Eindhoven"}],
    "IN": [
        {"name": "Bangalore", "region": "KA"}, {"name": "Mumbai", "region": "MH"},
        {"name": "Delhi NCR", "region": "DL"}, {"name": "Hyderabad", "region": "TS"},
        {"name": "Chennai", "region": "TN"}, {"name": "Pune", "region": "MH"},
        {"name": "Kolkata", "region": "WB"}, {"name": "Noida", "region": "UP"},
        {"name": "Gurugram", "region": "HR"}, {"name": "Ahmedabad", "region": "GJ"},
    ],
    "AU": [
        {"name": "Sydney", "region": "NSW"}, {"name": "Melbourne", "region": "VIC"},
        {"name": "Brisbane", "region": "QLD"}, {"name": "Perth", "region": "WA"},
    ],
    "SG": [{"name": "Singapore"}],
    "JP": [{"name": "Tokyo"}, {"name": "Osaka"}, {"name": "Yokohama"}, {"name": "Fukuoka"}],
    "AE": [{"name": "Dubai"}, {"name": "Abu Dhabi"}, {"name": "Sharjah"}],
    "BR": [{"name": "Sao Paulo"}, {"name": "Rio de Janeiro"}, {"name": "Brasilia"}],
    "IL": [{"name": "Tel Aviv"}, {"name": "Jerusalem"}, {"name": "Haifa"}],
}

CURRENCIES = [
    {"code": "USD", "name": "US Dollar", "symbol": "$"},
    {"code": "EUR", "name": "Euro", "symbol": "\u20ac"},
    {"code": "GBP", "name": "British Pound", "symbol": "\u00a3"},
    {"code": "CAD", "name": "Canadian Dollar", "symbol": "CA$"},
    {"code": "AUD", "name": "Australian Dollar", "symbol": "A$"},
    {"code": "NZD", "name": "New Zealand Dollar", "symbol": "NZ$"},
    {"code": "CHF", "name": "Swiss Franc", "symbol": "CHF"},
    {"code": "SEK", "name": "Swedish Krona", "symbol": "kr"},
    {"code": "NOK", "name": "Norwegian Krone", "symbol": "kr"},
    {"code": "DKK", "name": "Danish Krone", "symbol": "kr"},
    {"code": "PLN", "name": "Polish Zloty", "symbol": "z\u0142"},
    {"code": "CZK", "name": "Czech Koruna", "symbol": "K\u010d"},
    {"code": "INR", "name": "Indian Rupee", "symbol": "\u20b9"},
    {"code": "CNY", "name": "Chinese Yuan", "symbol": "\u00a5"},
    {"code": "JPY", "name": "Japanese Yen", "symbol": "\u00a5"},
    {"code": "KRW", "name": "South Korean Won", "symbol": "\u20a9"},
    {"code": "SGD", "name": "Singapore Dollar", "symbol": "S$"},
    {"code": "HKD", "name": "Hong Kong Dollar", "symbol": "HK$"},
    {"code": "THB", "name": "Thai Baht", "symbol": "\u0e3f"},
    {"code": "MYR", "name": "Malaysian Ringgit", "symbol": "RM"},
    {"code": "IDR", "name": "Indonesian Rupiah", "symbol": "Rp"},
    {"code": "PHP", "name": "Philippine Peso", "symbol": "\u20b1"},
    {"code": "AED", "name": "UAE Dirham", "symbol": "AED"},
    {"code": "SAR", "name": "Saudi Riyal", "symbol": "SAR"},
    {"code": "ILS", "name": "Israeli Shekel", "symbol": "\u20aa"},
    {"code": "BRL", "name": "Brazilian Real", "symbol": "R$"},
    {"code": "MXN", "name": "Mexican Peso", "symbol": "MX$"},
    {"code": "ZAR", "name": "South African Rand", "symbol": "R"},
    {"code": "NGN", "name": "Nigerian Naira", "symbol": "\u20a6"},
    {"code": "KES", "name": "Kenyan Shilling", "symbol": "KSh"},
    {"code": "EGP", "name": "Egyptian Pound", "symbol": "E\u00a3"},
    {"code": "PKR", "name": "Pakistani Rupee", "symbol": "\u20a8"},
    {"code": "BDT", "name": "Bangladeshi Taka", "symbol": "\u09f3"},
    {"code": "TRY", "name": "Turkish Lira", "symbol": "\u20ba"},
    {"code": "RUB", "name": "Russian Ruble", "symbol": "\u20bd"},
    {"code": "COP", "name": "Colombian Peso", "symbol": "CO$"},
    {"code": "ARS", "name": "Argentine Peso", "symbol": "AR$"},
    {"code": "CLP", "name": "Chilean Peso", "symbol": "CL$"},
]


@router.get("/countries")
async def list_countries(
    continent: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    results = COUNTRIES
    if continent:
        results = [c for c in results if c["continent"].lower() == continent.lower()]
    if search:
        q = search.lower()
        results = [c for c in results if q in c["name"].lower() or q in c["code"].lower()]
    return results


@router.get("/cities")
async def list_cities(
    country: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    if country:
        cities = CITIES.get(country.upper(), [])
    else:
        cities = [c for city_list in CITIES.values() for c in city_list]

    if search:
        q = search.lower()
        cities = [c for c in cities if q in c["name"].lower()]

    return cities


@router.get("/currencies")
async def list_currencies(
    search: Optional[str] = Query(None),
):
    results = CURRENCIES
    if search:
        q = search.lower()
        results = [
            c for c in results
            if q in c["code"].lower() or q in c["name"].lower()
        ]
    return results
