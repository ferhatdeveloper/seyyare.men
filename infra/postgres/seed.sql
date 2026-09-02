-- Seyyare.men seed data
-- Ülkeler, markalar, vücut tipleri, yakıt tipleri

-- Ülkeler
CREATE TABLE IF NOT EXISTS public.countries (
  code char(2) PRIMARY KEY,
  name jsonb NOT NULL,
  currency_code char(3),
  phone_code varchar(8),
  default_locale varchar(10)
);

INSERT INTO public.countries (code, name, currency_code, phone_code, default_locale) VALUES
  ('TR', '{"tr":"Türkiye","en":"Turkey","ar":"تركيا","fa":"ترکیه","ku-bad":"Tirkiye","ku-sor":"تورکیا"}', 'TRY', '+90', 'tr'),
  ('IQ', '{"tr":"Irak","en":"Iraq","ar":"العراق","fa":"عراق","ku-bad":"Eraq","ku-sor":"عێراق"}', 'IQD', '+964', 'ar'),
  ('DE', '{"tr":"Almanya","en":"Germany","ar":"ألمانيا","fa":"آلمان","ku-bad":"Almanya","ku-sor":"ئەڵمانیا"}', 'EUR', '+49', 'de'),
  ('US', '{"tr":"ABD","en":"United States","ar":"الولايات المتحدة","fa":"ایالات متحده","ku-bad":"DYA","ku-sor":"ئەمریکا"}', 'USD', '+1', 'en'),
  ('SA', '{"tr":"Suudi Arabistan","en":"Saudi Arabia","ar":"السعودية","fa":"عربستان سعودی","ku-bad":"Saudi Erebistani","ku-sor":"سعودیە"}', 'SAR', '+966', 'ar'),
  ('AE', '{"tr":"BAE","en":"UAE","ar":"الإمارات","fa":"امارات","ku-bad":"BAE","ku-sor":"ئیمارات"}', 'AED', '+971', 'ar'),
  ('GB', '{"tr":"İngiltere","en":"United Kingdom","ar":"المملكة المتحدة","fa":"بریتانیا","ku-bad":"Brîtanya","ku-sor":"بریتانیا"}', 'GBP', '+44', 'en'),
  ('FR', '{"tr":"Fransa","en":"France","ar":"فرنسا","fa":"فرانسه","ku-bad":"Fransa","ku-sor":"فڕانسە"}', 'EUR', '+33', 'fr'),
  ('NL', '{"tr":"Hollanda","en":"Netherlands","ar":"هولندا","fa":"هلند","ku-bad":"Hollanda","ku-sor":"هۆڵەندا"}', 'EUR', '+31', 'nl'),
  ('SE', '{"tr":"İsveç","en":"Sweden","ar":"السويد","fa":"سوئد","ku-bad":"Swêd","ku-sor":"سوید"}', 'SEK', '+46', 'sv')
ON CONFLICT (code) DO NOTHING;

-- Araç markaları (en yaygın 50)
CREATE TABLE IF NOT EXISTS public.brands (
  id serial PRIMARY KEY,
  name jsonb NOT NULL,
  logo_url text,
  country_code char(2) REFERENCES public.countries(code),
  is_premium boolean DEFAULT false,
  is_electric boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.brands (name, country_code, is_premium, is_electric) VALUES
  (('{"en":"Toyota","tr":"Toyota","ar":"تويوتا","fa":"تویوتا","ku-bad":"Toyota","ku-sor":"تۆیۆتا"}')::jsonb, 'JP', false, false),
  (('{"en":"Volkswagen","tr":"Volkswagen","ar":"فولكس فاجن","fa":"فولکس واگن","ku-bad":"Volkswagen","ku-sor":"ڤۆلکسواگن"}')::jsonb, 'DE', false, false),
  (('{"en":"BMW","tr":"BMW","ar":"بي إم دبليو","fa":"بی‌ام‌و","ku-bad":"BMW","ku-sor":"بی‌ئێم‌و"}')::jsonb, 'DE', true, false),
  (('{"en":"Mercedes-Benz","tr":"Mercedes-Benz","ar":"مرسيدس بنز","fa":"مرسدس بنز","ku-bad":"Mercedes-Benz","ku-sor":"مرسدس بنز"}')::jsonb, 'DE', true, false),
  (('{"en":"Audi","tr":"Audi","ar":"أودي","fa":"آئودی","ku-bad":"Audi","ku-sor":"ئودی"}')::jsonb, 'DE', true, false),
  (('{"en":"Ford","tr":"Ford","ar":"فورد","fa":"فورد","ku-bad":"Ford","ku-sor":"فۆرد"}')::jsonb, 'US', false, false),
  (('{"en":"Honda","tr":"Honda","ar":"هوندا","fa":"هوندا","ku-bad":"Honda","ku-sor":"هوندا"}')::jsonb, 'JP', false, false),
  (('{"en":"Hyundai","tr":"Hyundai","ar":"هيونداي","fa":"هیوندای","ku-bad":"Hyundai","ku-sor":"هیوندائی"}')::jsonb, 'KR', false, false),
  (('{"en":"Kia","tr":"Kia","ar":"كيا","fa":"کیا","ku-bad":"Kia","ku-sor":"کیا"}')::jsonb, 'KR', false, false),
  (('{"en":"Nissan","tr":"Nissan","ar":"نيسان","fa":"نیسان","ku-bad":"Nissan","ku-sor":"نیسان"}')::jsonb, 'JP', false, false),
  (('{"en":"Peugeot","tr":"Peugeot","ar":"بيجو","fa":"پژو","ku-bad":"Peugeot","ku-sor":"پژۆ"}')::jsonb, 'FR', false, false),
  (('{"en":"Renault","tr":"Renault","ar":"رينو","fa":"رنو","ku-bad":"Renault","ku-sor":"رینۆ"}')::jsonb, 'FR', false, false),
  (('{"en":"Fiat","tr":"Fiat","ar":"فيات","fa":"فیات","ku-bad":"Fiat","ku-sor":"فیات"}')::jsonb, 'IT', false, false),
  (('{"en":"Opel","tr":"Opel","ar":"أوبل","fa":"اوپل","ku-bad":"Opel","ku-sor":"ئۆپێل"}')::jsonb, 'DE', false, false),
  (('{"en":"Skoda","tr":"Škoda","ar":"سكودا","fa":"اشکودا","ku-bad":"Škoda","ku-sor":"ئێسکودا"}')::jsonb, 'CZ', false, false),
  (('{"en":"Seat","tr":"Seat","ar":"سيات","fa":"سئات","ku-bad":"Seat","ku-sor":"سیات"}')::jsonb, 'ES', false, false),
  (('{"en":"Citroen","tr":"Citroën","ar":"سيتروين","fa":"سیتروئن","ku-bad":"Citroën","ku-sor":"سیتڕۆئن"}')::jsonb, 'FR', false, false),
  (('{"en":"Mazda","tr":"Mazda","ar":"مازدا","fa":"مزدا","ku-bad":"Mazda","ku-sor":"مازدا"}')::jsonb, 'JP', false, false),
  (('{"en":"Mitsubishi","tr":"Mitsubishi","ar":"ميتسوبيشي","fa":"میتسوبیشی","ku-bad":"Mitsubishi","ku-sor":"میتسوبیشی"}')::jsonb, 'JP', false, false),
  (('{"en":"Suzuki","tr":"Suzuki","ar":"سوزوكي","fa":"سوزوکی","ku-bad":"Suzuki","ku-sor":"سوزوکی"}')::jsonb, 'JP', false, false),
  (('{"en":"Subaru","tr":"Subaru","ar":"سوبارو","fa":"سوبارو","ku-bad":"Subaru","ku-sor":"سوبارو"}')::jsonb, 'JP', false, false),
  (('{"en":"Lexus","tr":"Lexus","ar":"لكزس","fa":"لکسوس","ku-bad":"Lexus","ku-sor":"لێکزوس"}')::jsonb, 'JP', true, false),
  (('{"en":"Tesla","tr":"Tesla","ar":"تسلا","fa":"تسلا","ku-bad":"Tesla","ku-sor":"تێسلا"}')::jsonb, 'US', true, true),
  (('{"en":"Porsche","tr":"Porsche","ar":"بورش","fa":"پورشه","ku-bad":"Porsche","ku-sor":"پۆرشە"}')::jsonb, 'DE', true, false),
  (('{"en":"Land Rover","tr":"Land Rover","ar":"لاند روفر","fa":"لندرور","ku-bad":"Land Rover","ku-sor":"لاندڕۆڤەر"}')::jsonb, 'GB', true, false),
  (('{"en":"Volvo","tr":"Volvo","ar":"فولفو","fa":"ولوو","ku-bad":"Volvo","ku-sor":"ڤۆلڤۆ"}')::jsonb, 'SE', true, false),
  (('{"en":"Jeep","tr":"Jeep","ar":"جيب","fa":"جیپ","ku-bad":"Jeep","ku-sor":"جیپ"}')::jsonb, 'US', false, false),
  (('{"en":"Chevrolet","tr":"Chevrolet","ar":"شيفروليه","fa":"شورلت","ku-bad":"Chevrolet","ku-sor":"شێڤرۆلی"}')::jsonb, 'US', false, false),
  (('{"en":"Dacia","tr":"Dacia","ar":"داسيا","fa":"داجیا","ku-bad":"Dacia","ku-sor":"داسیا"}')::jsonb, 'RO', false, false),
  (('{"en":"BYD","tr":"BYD","ar":"بي واي دي","fa":"بی‌وایدی","ku-bad":"BYD","ku-sor":"بی‌وایدی"}')::jsonb, 'CN', false, true),
  (('{"en":"Togg","tr":"Togg","ar":"توغ","fa":"توگ","ku-bad":"Togg","ku-sor":"توگ"}')::jsonb, 'TR', false, true)
ON CONFLICT DO NOTHING;

-- Vücut tipleri
CREATE TABLE IF NOT EXISTS public.body_types (
  id serial PRIMARY KEY,
  code varchar(32) UNIQUE NOT NULL,
  name jsonb NOT NULL
);

INSERT INTO public.body_types (code, name) VALUES
  ('sedan', ('{"en":"Sedan","tr":"Sedan","ar":"سيدان","fa":"سدان","ku-bad":"Sedan","ku-sor":"سەدان"}')::jsonb),
  ('hatchback', ('{"en":"Hatchback","tr":"Hatchback","ar":"هاتشباك","fa":"هاچبک","ku-bad":"Hatchback","ku-sor":"هاچبەک"}')::jsonb),
  ('suv', ('{"en":"SUV","tr":"SUV","ar":"دفع رباعي","fa":"شاسی‌بلند","ku-bad":"SUV","ku-sor":"سەیوو"}')::jsonb),
  ('pickup', ('{"en":"Pickup","tr":"Pickup","ar":"بيك أب","fa":"وانت","ku-bad":"Pîkap","ku-sor":"پیکاپ"}')::jsonb),
  ('coupe', ('{"en":"Coupe","tr":"Coupe","ar":"كوبيه","fa":"کوپه","ku-bad":"Coupe","ku-sor":"کوپێ"}')::jsonb),
  ('convertible', ('{"en":"Convertible","tr":"Cabrio","ar":"كابريو","fa":"کابریولت","ku-bad":"Kabrio","ku-sor":"کابریۆ"}')::jsonb),
  ('wagon', ('{"en":"Wagon","tr":"Station Wagon","ar":"ستيشن","fa":"استیشن","ku-bad":"Station Wagon","ku-sor":"ستەیشن"}')::jsonb),
  ('van', ('{"en":"Van","tr":"Van","ar":"فان","fa":"ون","ku-bad":"Van","ku-sor":"ڤان"}')::jsonb),
  ('minivan', ('{"en":"Minivan","tr":"Minivan","ar":"ميني فان","fa":"مینی‌ون","ku-bad":"Minivan","ku-sor":"مینیڤان"}')::jsonb),
  ('truck', ('{"en":"Truck","tr":"Kamyon","ar":"شاحنة","fa":"کامیون","ku-bad":"Kamyon","ku-sor":"کامیۆن"}')::jsonb),
  ('motorcycle', ('{"en":"Motorcycle","tr":"Motosiklet","ar":"دراجة نارية","fa":"موتورسیکلت","ku-bad":"Motosîklet","ku-sor":"ماتۆڕسکلێت"}')::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Yakıt tipleri
CREATE TABLE IF NOT EXISTS public.fuel_types (
  id serial PRIMARY KEY,
  code varchar(32) UNIQUE NOT NULL,
  name jsonb NOT NULL
);

INSERT INTO public.fuel_types (code, name) VALUES
  ('gasoline', ('{"en":"Gasoline","tr":"Benzin","ar":"بنزين","fa":"بنزین","ku-bad":"Benzîn","ku-sor":"بەنزین"}')::jsonb),
  ('diesel', ('{"en":"Diesel","tr":"Dizel","ar":"ديزل","fa":"دیزل","ku-bad":"Dîzel","ku-sor":"دیزەڵ"}')::jsonb),
  ('lpg', ('{"en":"LPG","tr":"LPG","ar":"غاز","fa":"گاز","ku-bad":"LPG","ku-sor":"گاز"}')::jsonb),
  ('hybrid', ('{"en":"Hybrid","tr":"Hibrit","ar":"هجين","fa":"هیبرید","ku-bad":"Hîbrît","ku-sor":"هیبرید"}')::jsonb),
  ('electric', ('{"en":"Electric","tr":"Elektrik","ar":"كهربائي","fa":"برقی","ku-bad":"Elektrîk","ku-sor":"کارەبا"}')::jsonb),
  ('cng', ('{"en":"CNG","tr":"CNG","ar":"غاز طبيعي","fa":"گاز طبیعی","ku-bad":"CNG","ku-sor":"گازی سروشتی"}')::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Vites tipleri
CREATE TABLE IF NOT EXISTS public.transmission_types (
  id serial PRIMARY KEY,
  code varchar(32) UNIQUE NOT NULL,
  name jsonb NOT NULL
);

INSERT INTO public.transmission_types (code, name) VALUES
  ('manual', ('{"en":"Manual","tr":"Manuel","ar":"يدوي","fa":"دنده‌ای","ku-bad":"Manuel","ku-sor":"دەستی"}')::jsonb),
  ('automatic', ('{"en":"Automatic","tr":"Otomatik","ar":"أوتوماتيك","fa":"اتوماتیک","ku-bad":"Otomatîk","ku-sor":"ئۆتۆماتیک"}')::jsonb),
  ('cvt', ('{"en":"CVT","tr":"CVT","ar":"متغير","fa":"CVT","ku-bad":"CVT","ku-sor":"سی‌ڤی‌تی"}')::jsonb),
  ('semi_auto', ('{"en":"Semi-Automatic","tr":"Yarı Otomatik","ar":"نصف أوتوماتيك","fa":"نیمه‌اتوماتیک","ku-bad":"Nîv-otomatîk","ku-sor":"نیوە ئۆتۆماتیک"}')::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Renkler
CREATE TABLE IF NOT EXISTS public.colors (
  id serial PRIMARY KEY,
  code varchar(32) UNIQUE NOT NULL,
  hex varchar(7) NOT NULL,
  name jsonb NOT NULL
);

INSERT INTO public.colors (code, hex, name) VALUES
  ('white', '#FFFFFF', ('{"en":"White","tr":"Beyaz","ar":"أبيض","fa":"سفید","ku-bad":"Spî","ku-sor":"سپی"}')::jsonb),
  ('black', '#000000', ('{"en":"Black","tr":"Siyah","ar":"أسود","fa":"مشکی","ku-bad":"Reş","ku-sor":"ڕەش"}')::jsonb),
  ('gray', '#808080', ('{"en":"Gray","tr":"Gri","ar":"رمادي","fa":"خاکستری","ku-bad":"Gri","ku-sor":"ڕەساسی"}')::jsonb),
  ('silver', '#C0C0C0', ('{"en":"Silver","tr":"Gümüş","ar":"فضي","fa":"نقره‌ای","ku-bad":"Zîv","ku-sor":"زیو"}')::jsonb),
  ('red', '#FF0000', ('{"en":"Red","tr":"Kırmızı","ar":"أحمر","fa":"قرمز","ku-bad":"Sor","ku-sor":"سوور"}')::jsonb),
  ('blue', '#0000FF', ('{"en":"Blue","tr":"Mavi","ar":"أزرق","fa":"آبی","ku-bad":"Şîn","ku-sor":"شین"}')::jsonb),
  ('green', '#008000', ('{"en":"Green","tr":"Yeşil","ar":"أخضر","fa":"سبز","ku-bad":"Keske","ku-sor":"سەوز"}')::jsonb),
  ('yellow', '#FFFF00', ('{"en":"Yellow","tr":"Sarı","ar":"أصفر","fa":"زرد","ku-bad":"Zer","ku-sor":"زەرد"}')::jsonb),
  ('orange', '#FFA500', ('{"en":"Orange","tr":"Turuncu","ar":"برتقالي","fa":"نارنجی","ku-bad":"Porteqalî","ku-sor":"نارنجی"}')::jsonb),
  ('brown', '#8B4513', ('{"en":"Brown","tr":"Kahverengi","ar":"بني","fa":"قهوه‌ای","ku-bad":"Qehweyî","ku-sor":"قاوەیی"}')::jsonb),
  ('beige', '#F5F5DC', ('{"en":"Beige","tr":"Bej","ar":"بيج","fa":"بژ","ku-bad":"Bej","ku-sor":"بەژ"}')::jsonb),
  ('gold', '#FFD700', ('{"en":"Gold","tr":"Altın","ar":"ذهبي","fa":"طلایی","ku-bad":"Zêr","ku-sor":"زێرین"}')::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Özellikler (araç ek özellikleri)
CREATE TABLE IF NOT EXISTS public.features (
  id serial PRIMARY KEY,
  code varchar(64) UNIQUE NOT NULL,
  category varchar(32),
  name jsonb NOT NULL
);

INSERT INTO public.features (code, category, name) VALUES
  ('abs', 'safety', ('{"en":"ABS","tr":"ABS","ar":"ABS","fa":"ABS","ku-bad":"ABS","ku-sor":"ABS"}')::jsonb),
  ('esp', 'safety', ('{"en":"ESP","tr":"ESP","ar":"ESP","fa":"ESP","ku-bad":"ESP","ku-sor":"ESP"}')::jsonb),
  ('airbag', 'safety', ('{"en":"Airbag","tr":"Hava Yastığı","ar":"وسادة هوائية","fa":"کیسه هوا","ku-bad":"Hewaya yastik","ku-sor":"کێشەی هەوا"}')::jsonb),
  ('cruise_control', 'comfort', ('{"en":"Cruise Control","tr":"Hız Sabitleyici","ar":"مثبت السرعة","fa":"کروز کنترل","ku-bad":"Leza sabît","ku-sor":"خێرایی جێگیر"}')::jsonb),
  ('sunroof', 'comfort', ('{"en":"Sunroof","tr":"Sunroof","ar":"فتحة سقف","fa":"سانروف","ku-bad":"Stûrê tavê","ku-sor":"سەقفی خۆر"}')::jsonb),
  ('leather_seats', 'comfort', ('{"en":"Leather Seats","tr":"Deri Koltuk","ar":"مقاعد جلدية","fa":"صندلی چرمی","ku-bad":"Niqişta çermî","ku-sor":"دانیشتنی چەرم"}')::jsonb),
  ('navigation', 'tech', ('{"en":"Navigation","tr":"Navigasyon","ar":"ملاحة","fa":"ناوبری","ku-bad":"Navîgasyon","ku-sor":"ڕێنمایی"}')::jsonb),
  ('reverse_camera', 'tech', ('{"en":"Reverse Camera","tr":"Geri Görüş Kamerası","ar":"كاميرا خلفية","fa":"دوربین عقب","ku-bad":"Kamera deryê","ku-sor":"کامێرای دواوە"}')::jsonb),
  ('parking_sensors', 'tech', ('{"en":"Parking Sensors","tr":"Park Sensörü","ar":"حساسات","fa":"سنسور پارک","ku-bad":"Park sensor","ku-sor":"سێنسۆری پارک"}')::jsonb),
  ('heated_seats', 'comfort', ('{"en":"Heated Seats","tr":"Isıtmalı Koltuk","ar":"مقاعد مُدفأة","fa":"صندلی گرمکن","ku-bad":"Niqişta germ","ku-sor":"دانیشتنی گەرم"}')::jsonb),
  ('apple_carplay', 'tech', ('{"en":"Apple CarPlay","tr":"Apple CarPlay","ar":"Apple CarPlay","fa":"اپل کارپلی","ku-bad":"Apple CarPlay","ku-sor":"ئەپڵ کارپلەی"}')::jsonb),
  ('android_auto', 'tech', ('{"en":"Android Auto","tr":"Android Auto","ar":"Android Auto","fa":"اندروید اتو","ku-bad":"Android Auto","ku-sor":"ئەندرۆید ئۆتۆ"}')::jsonb),
  ('keyless_entry', 'comfort', ('{"en":"Keyless Entry","tr":"Anahtarsız Giriş","ar":"دخول بدون مفتاح","fa":"ورود بدون کلید","ku-bad":"Bê kilît","ku-sor":"بێ کلیل"}')::jsonb),
  ('led_headlights', 'tech', ('{"en":"LED Headlights","tr":"LED Far","ar":"أضواء LED","fa":"چراغ LED","ku-bad":"LED Çirûg","ku-sor":"چرای LED"}')::jsonb),
  ('ac', 'comfort', ('{"en":"Air Conditioning","tr":"Klima","ar":"تكييف","fa":"تهویه","ku-bad":"Klîma","ku-sor":"کلیما"}')::jsonb)
ON CONFLICT (code) DO NOTHING;