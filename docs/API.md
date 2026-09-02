# API Dokümanı

## Genel Bakış

Seyyare.men API'si 3 servisten oluşur:

| Servis | URL (dev) | Amaç |
|--------|-----------|------|
| PostgREST | http://localhost:3000 | Ana CRUD API (DB → REST) |
| Auth | http://localhost:5000 | Register/login/refresh/logout |
| AI | http://localhost:4000 | OpenRouter proxy (vision, price, translate, vb.) |

## Auth Endpoints

### POST /auth/register
```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "displayName": "Ahmet Yılmaz",
  "role": "user",
  "locale": "tr"
}
```

Response:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "abc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": null,
    "role": "user",
    "locale": "tr"
  }
}
```

### POST /auth/login
```json
{ "identifier": "user@example.com", "password": "..." }
```

### POST /auth/refresh
```json
{ "refreshToken": "abc..." }
```

### POST /auth/logout
```json
{ "refreshToken": "abc..." }
```

### GET /auth/me
Headers: `Authorization: Bearer {accessToken}`

## PostgREST (DB → REST)

### GET /vehicles?status=eq.active

PostgREST filtresi:
- `?id=eq.{uuid}` — tek ilan
- `?make_id=in.{1,2,3}` — birden fazla marka
- `?price_amount=gte.100000&price_amount=lte.500000`
- `?order=created_at.desc`
- `?limit=20&offset=0`

Embed:
- `?select=*,vehicle_media(*),seller:users!seller_id(user_profiles(*))`

### POST /vehicles
Body: Vehicle JSON (CreateVehicleSchema)

### POST /rpc/search_vehicles

Full-text + PostGIS arama:

```json
{
  "p_q": "BMW",
  "p_make_ids": [3, 4],
  "p_body_type_ids": [3],
  "p_fuel_type_ids": null,
  "p_transmission_ids": [2],
  "p_country_code": "TR",
  "p_min_year": 2018,
  "p_max_year": 2024,
  "p_min_price": 100000,
  "p_max_price": 1000000,
  "p_lat": 41.0082,
  "p_lng": 28.9784,
  "p_radius_km": 50,
  "p_locale": "tr",
  "p_sort_by": "price",
  "p_sort_dir": "asc",
  "p_page_size": 20,
  "p_page_offset": 0
}
```

### POST /rpc/list_reference_data
```json
{ "p_locale": "tr" }
```

Returns: `{ countries, brands, body_types, fuel_types, transmission_types, colors, features }`

## AI Endpoints

### POST /ai/recognize (multipart)
- Field: `images` (1-8 files)
- Returns: `{ make, makeConfidence, model, modelConfidence, year, bodyType, color, overallConfidence, alternatives[] }`

### POST /ai/price-suggest
```json
{
  "make": "Toyota",
  "model": "Corolla",
  "year": 2020,
  "mileageKm": 50000,
  "fuelType": "gasoline",
  "transmission": "automatic",
  "condition": "used",
  "countryCode": "TR",
  "currency": "USD"
}
```

Returns: `{ suggestedPrice, rangeLow, rangeHigh, currency, confidence, factors[], marketComparisons, explanation }`

### POST /ai/translate
```json
{
  "text": "BMW X5 2020 model, 50.000 km, otomatik",
  "sourceLocale": "tr",
  "targetLocales": ["en", "ar", "fa"],
  "context": "vehicle_description"
}
```

Returns: `{ sourceLocale, translations: [{ targetLocale, text }] }`

### POST /ai/translate/batch
```json
{
  "items": [{ "id": "title-1", "text": "..." }, { "id": "desc-1", "text": "..." }],
  "sourceLocale": "tr",
  "targetLocales": ["en", "ar"]
}
```

### POST /ai/generate-description
```json
{
  "vehicle": {
    "make": "BMW", "model": "320i", "year": 2020,
    "mileageKm": 60000, "condition": "used"
  },
  "locale": "tr",
  "tone": "professional",
  "maxLength": 600
}
```

### POST /ai/damage-detect (multipart)
- Field: `images` (2-12 files)
- Returns: `{ damages[], overallScore, estimatedRepairCost, recommendation, notes }`

### POST /ai/assistant
```json
{
  "messages": [
    { "role": "user", "content": "2020 sonrası otomatik SUV öner" }
  ],
  "locale": "tr"
}
```

Returns: `{ reply, suggestedFilters?, matchedVehicles?, usage }`

### GET /ai/rental-price
Query params:
- `rentalId` (uuid)
- `startDate` (YYYY-MM-DD)
- `endDate` (YYYY-MM-DD)

Returns: `{ days, baseAmount, finalAmount, currency, factors[], breakdown[], confidence }`

### POST /ai/fraud-check
```json
{ "vehicleId": "uuid" }
```

Returns: `{ riskScore, riskLevel, flags[], recommendation, explanation }`

### GET /ai/admin/analytics (admin only)
Returns: `{ totalVehicles, totalRentals, totalUsers, newListingsLast7Days, newListingsTrend, avgPriceChange, topMakes[], topCountries[], aiUsage }`