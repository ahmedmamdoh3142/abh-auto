-- ============================================================================
--  ABH AUTO — DATABASE SCHEMA  (PostgreSQL 16)
--  ----------------------------------------------------------------------------
--  مبدأ التصميم:
--   • كل النصوص ثنائية اللغة تُخزَّن في عمود JSONB بالشكل: {"en": "...", "ar": "..."}
--   • كل الكيانات لها sort + is_active للتحكم الكامل من لوحة الإدارة عبر الـAPIs
--   • أعمدة created_at / updated_at على كل جدول قابل للتعديل (تريغر تلقائي)
--   • الحجز يعتمد على brands -> brand_models -> vehicle_sizes (يحدّد السعر)
--  ----------------------------------------------------------------------------
--  شغّل هذا الملف أولاً ثم 02_seed.sql
-- ============================================================================

BEGIN;

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email

-- ── Enums ───────────────────────────────────────────────────────────────────
CREATE TYPE service_surface AS ENUM ('home', 'booking', 'catalog');
CREATE TYPE pricing_model   AS ENUM ('multiplier', 'fixed', 'on_request');
CREATE TYPE project_craft   AS ENUM ('ceramic', 'ppf', 'armor', 'tracking', 'detailing');
CREATE TYPE booking_status  AS ENUM ('upcoming', 'active', 'completed', 'cancelled');
CREATE TYPE payment_status  AS ENUM ('paid', 'pay_at_branch', 'pending', 'refunded');
CREATE TYPE contact_status  AS ENUM ('new', 'read', 'responded', 'archived');
CREATE TYPE user_role       AS ENUM ('member', 'staff', 'admin');

-- ── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- helper to attach the trigger
CREATE OR REPLACE FUNCTION attach_updated_at(tbl regclass) RETURNS void AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();', tbl);
END;
$$ LANGUAGE plpgsql;

-- booking reference generator: ABH-XXXXX
CREATE OR REPLACE FUNCTION gen_booking_ref() RETURNS text AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
BEGIN
  FOR i IN 1..5 LOOP
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN 'ABH-' || out;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
--  1. REFERENCE / LOOKUP TABLES
-- ============================================================================

-- أحجام السيارات (تحدد مضاعف السعر)
CREATE TABLE vehicle_sizes (
  code        text PRIMARY KEY,                 -- small | medium | large
  name        jsonb NOT NULL,
  examples    jsonb,
  multiplier  numeric(4,2) NOT NULL DEFAULT 1,  -- 1.00 / 1.25 / 1.55
  sort        int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

-- ألوان السيارات
CREATE TABLE colors (
  code      text PRIMARY KEY,
  name      jsonb NOT NULL,
  hex       text NOT NULL,
  is_light  boolean NOT NULL DEFAULT false,
  sort      int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

-- المدن
CREATE TABLE cities (
  code      text PRIMARY KEY,
  name      jsonb NOT NULL,
  sort      int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

-- الفروع
CREATE TABLE branches (
  code       text PRIMARY KEY,
  name       jsonb NOT NULL,
  city_code  text REFERENCES cities(code) ON DELETE SET NULL,
  address    jsonb,
  lat        numeric(9,6),
  lng        numeric(9,6),
  phone      text,
  sort       int NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ماركات السيارات
CREATE TABLE brands (
  id         text PRIMARY KEY,                  -- 'rolls', 'ferrari', ...
  name       text NOT NULL,
  sort       int NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- موديلات كل ماركة (يحدد كل موديل حجمه => السعر في الحجز)
CREATE TABLE brand_models (
  id         serial PRIMARY KEY,
  brand_id   text NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name       text NOT NULL,
  size_code  text NOT NULL REFERENCES vehicle_sizes(code) DEFAULT 'large',
  sort       int NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  UNIQUE (brand_id, name)
);
CREATE INDEX idx_brand_models_brand ON brand_models(brand_id);

-- طرق الدفع
CREATE TABLE payment_methods (
  code        text PRIMARY KEY,                 -- tabby | tamara | applePay | cash
  name        jsonb NOT NULL,
  description jsonb,
  sort        int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

-- خيارات السطحة / الاستلام
CREATE TABLE towing_options (
  code  text PRIMARY KEY,                       -- oneway | return | both
  name  jsonb NOT NULL,
  cost  numeric(10,2) NOT NULL DEFAULT 0,
  sort  int NOT NULL DEFAULT 0
);

-- مواعيد متاحة (كتالوج الأوقات)
CREATE TABLE time_slots (
  id        serial PRIMARY KEY,
  period    text NOT NULL,                      -- morning | afternoon | evening
  slot_time text NOT NULL,                      -- '09:00'
  sort      int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (slot_time)
);

-- ============================================================================
--  2. SERVICE CATALOGUE
-- ============================================================================

-- فئات الخدمات (مفصولة حسب السطح: home / booking / catalog)
CREATE TABLE service_categories (
  id        serial PRIMARY KEY,
  surface   service_surface NOT NULL,
  slug      text NOT NULL,
  name      jsonb NOT NULL,
  tagline   jsonb,
  icon      text,
  numeral   text,
  sort      int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (surface, slug)
);

-- الخدمات
CREATE TABLE services (
  id                serial PRIMARY KEY,
  category_id       int REFERENCES service_categories(id) ON DELETE SET NULL,
  surface           service_surface NOT NULL,
  slug              text NOT NULL,
  name              jsonb NOT NULL,
  tagline           jsonb,
  blurb             jsonb,
  description       jsonb,
  image             text,
  badge             text,                       -- signature | new | null
  duration          jsonb,
  warranty_duration jsonb,
  pricing_model     pricing_model NOT NULL DEFAULT 'multiplier',
  base_price        numeric(10,2),              -- لطراز multiplier (سعر الحجم small)
  old_base_price    numeric(10,2),
  is_on_request     boolean NOT NULL DEFAULT false,
  is_featured       boolean NOT NULL DEFAULT false,
  sort              int NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (surface, slug)
);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_surface  ON services(surface);

-- ما تتضمنه الخدمة (نقاط)
CREATE TABLE service_includes (
  id         serial PRIMARY KEY,
  service_id int NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  label      jsonb NOT NULL,
  sort       int NOT NULL DEFAULT 0
);
CREATE INDEX idx_service_includes_service ON service_includes(service_id);

-- ملاحظات الضمان
CREATE TABLE service_warranty_notes (
  id         serial PRIMARY KEY,
  service_id int NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  note       jsonb NOT NULL,
  sort       int NOT NULL DEFAULT 0
);

-- أسعار الخدمة لكل حجم (المصدر النهائي للسعر الذي يظهر للعميل)
CREATE TABLE service_prices (
  id         serial PRIMARY KEY,
  service_id int NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  size_code  text NOT NULL REFERENCES vehicle_sizes(code),
  price      numeric(10,2) NOT NULL,
  old_price  numeric(10,2),
  UNIQUE (service_id, size_code)
);
CREATE INDEX idx_service_prices_service ON service_prices(service_id);

-- ============================================================================
--  3. OFFERS & PACKAGES
-- ============================================================================

-- كروت العروض (مجموعة الصفحة الرئيسية 'home' أو الكاملة 'all')
CREATE TABLE offers (
  id             serial PRIMARY KEY,
  collection     text NOT NULL DEFAULT 'home',  -- home | all
  slug           text,
  tag            jsonb,
  title          jsonb NOT NULL,
  copy           jsonb,
  discount_label text,                          -- "-25%" | "VIP" | "خصم 18٪"
  image          text,
  sort           int NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_offers_collection ON offers(collection);

-- باقات صفحة العروض (Summer / Diamond / Elite)
CREATE TABLE packages (
  id          serial PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  name        jsonb NOT NULL,
  copy        jsonb,
  lead        jsonb,
  terms       jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  sort        int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE package_features (
  id         serial PRIMARY KEY,
  package_id int NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  label      jsonb NOT NULL,
  sort       int NOT NULL DEFAULT 0
);
CREATE TABLE package_includes (
  id         serial PRIMARY KEY,
  package_id int NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  label      jsonb NOT NULL,
  sort       int NOT NULL DEFAULT 0
);
CREATE TABLE package_steps (
  id          serial PRIMARY KEY,
  package_id  int NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  title       jsonb NOT NULL,
  description jsonb,
  sort        int NOT NULL DEFAULT 0
);

-- مصفوفة المقارنة بين الباقات
CREATE TABLE package_comparison (
  id      serial PRIMARY KEY,
  label   jsonb NOT NULL,
  summer  jsonb NOT NULL,
  diamond jsonb NOT NULL,
  elite   jsonb NOT NULL,
  sort    int NOT NULL DEFAULT 0
);

-- ============================================================================
--  4. PORTFOLIO & SOCIAL PROOF
-- ============================================================================

CREATE TABLE projects (
  id               serial PRIMARY KEY,
  slug             text UNIQUE,
  title            text NOT NULL,               -- موديل السيارة
  category_label   jsonb,                       -- التصنيف المعروض
  craft            project_craft,
  year             int,
  image_after      text NOT NULL,
  image_before     text,
  is_featured_home boolean NOT NULL DEFAULT true,
  sort             int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_specs (
  id         serial PRIMARY KEY,
  project_id int NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label      jsonb NOT NULL,
  value      jsonb NOT NULL,
  sort       int NOT NULL DEFAULT 0
);
CREATE TABLE project_steps (
  id          serial PRIMARY KEY,
  project_id  int NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       jsonb NOT NULL,
  description jsonb,
  sort        int NOT NULL DEFAULT 0
);

CREATE TABLE testimonials (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  role       jsonb,
  quote      jsonb NOT NULL,
  rating     int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  avatar_url text,
  sort       int NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stats (
  id     serial PRIMARY KEY,
  code   text UNIQUE NOT NULL,                  -- cars | clients | cities | years
  value  bigint NOT NULL,
  suffix text DEFAULT '',
  label  jsonb NOT NULL,
  sort   int NOT NULL DEFAULT 0
);

CREATE TABLE faqs (
  id        serial PRIMARY KEY,
  question  jsonb NOT NULL,
  answer    jsonb NOT NULL,
  sort      int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE marquee_items (
  id    serial PRIMARY KEY,
  label jsonb NOT NULL,
  sort  int NOT NULL DEFAULT 0
);

-- ============================================================================
--  5. MEMBERS, GARAGE & BOOKINGS
-- ============================================================================

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         citext UNIQUE NOT NULL,
  phone         text,
  city_code     text REFERENCES cities(code) ON DELETE SET NULL,
  password_hash text,                           -- bcrypt/argon2 (لا تخزّن plaintext)
  role          user_role NOT NULL DEFAULT 'member',
  member_since  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id   text REFERENCES brands(id) ON DELETE SET NULL,
  model      text,
  color_code text REFERENCES colors(code) ON DELETE SET NULL,
  plate      text,
  year       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicles_user ON vehicles(user_id);

CREATE TABLE bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference           text UNIQUE NOT NULL DEFAULT gen_booking_ref(),
  user_id             uuid REFERENCES users(id) ON DELETE SET NULL,
  status              booking_status NOT NULL DEFAULT 'upcoming',
  -- لقطة بيانات السيارة وقت الحجز
  vehicle_label       text,
  plate               text,
  brand_id            text REFERENCES brands(id) ON DELETE SET NULL,
  model               text,
  size_code           text REFERENCES vehicle_sizes(code),
  color_code          text REFERENCES colors(code) ON DELETE SET NULL,
  -- الموعد والمكان
  branch_code         text REFERENCES branches(code) ON DELETE SET NULL,
  scheduled_date      date,
  scheduled_time      text,
  -- التسعير
  subtotal            numeric(12,2) NOT NULL DEFAULT 0,
  towing_code         text REFERENCES towing_options(code) ON DELETE SET NULL,
  towing_cost         numeric(10,2) NOT NULL DEFAULT 0,
  towing_address      text,
  total               numeric(12,2) NOT NULL DEFAULT 0,
  -- الدفع
  payment_method_code text REFERENCES payment_methods(code) ON DELETE SET NULL,
  payment_status      payment_status NOT NULL DEFAULT 'pending',
  -- تتبع التنفيذ
  stage               int NOT NULL DEFAULT 0,   -- 0..4
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_user   ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date   ON bookings(scheduled_date);
CREATE INDEX idx_bookings_branch ON bookings(branch_code);

CREATE TABLE booking_items (
  id            serial PRIMARY KEY,
  booking_id    uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id    int REFERENCES services(id) ON DELETE SET NULL,
  service_slug  text NOT NULL,
  name_snapshot jsonb,
  size_code     text REFERENCES vehicle_sizes(code),
  unit_price    numeric(10,2) NOT NULL DEFAULT 0,
  quantity      int NOT NULL DEFAULT 1,
  line_total    numeric(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);

CREATE TABLE booking_status_history (
  id         serial PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status     booking_status NOT NULL,
  stage      int,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_history_booking ON booking_status_history(booking_id);

-- ============================================================================
--  6. INBOUND (Contact / Newsletter)
-- ============================================================================

CREATE TABLE contact_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  intent     text,
  vehicle    text,
  email      citext NOT NULL,
  phone      text,
  message    text,
  consent    boolean NOT NULL DEFAULT false,
  locale     text DEFAULT 'ar',
  status     contact_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_status ON contact_messages(status);

CREATE TABLE newsletter_subscribers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      citext UNIQUE NOT NULL,
  locale     text DEFAULT 'ar',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
--  7. SETTINGS & EDITABLE CONTENT
-- ============================================================================

-- إعدادات عامة (اسم العلامة، التواصل، روابط السوشيال، فيديو الهيرو...)
CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- نصوص الأقسام القابلة للتعديل (عناوين الأقسام، الهيرو، البانر، الفوتر...)
-- key مثل: 'section.offers' أو 'hero' أو 'banner' — value = JSON كامل ثنائي اللغة
CREATE TABLE content_blocks (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── attach updated_at triggers ───────────────────────────────────────────────
SELECT attach_updated_at('branches');
SELECT attach_updated_at('brands');
SELECT attach_updated_at('services');
SELECT attach_updated_at('offers');
SELECT attach_updated_at('packages');
SELECT attach_updated_at('projects');
SELECT attach_updated_at('testimonials');
SELECT attach_updated_at('users');
SELECT attach_updated_at('vehicles');
SELECT attach_updated_at('bookings');
SELECT attach_updated_at('settings');
SELECT attach_updated_at('content_blocks');

-- ============================================================================
--  8. VIEWS (تسهّل عمل الـAPIs)
-- ============================================================================

-- سعر كل خدمة لكل حجم مع نسبة الخصم
CREATE VIEW v_service_pricing AS
SELECT
  s.id            AS service_id,
  s.surface,
  s.slug,
  sp.size_code,
  sp.price,
  sp.old_price,
  CASE WHEN sp.old_price IS NOT NULL AND sp.old_price > sp.price
       THEN round((1 - sp.price / sp.old_price) * 100)::int ELSE 0 END AS discount_pct
FROM services s
JOIN service_prices sp ON sp.service_id = s.id;

-- الموديلات مع حجمها ومضاعف السعر (للـcascade في الحجز)
CREATE VIEW v_brand_models AS
SELECT b.id AS brand_id, b.name AS brand_name,
       m.id AS model_id, m.name AS model_name,
       m.size_code, vs.multiplier
FROM brands b
JOIN brand_models m ON m.brand_id = b.id
JOIN vehicle_sizes vs ON vs.code = m.size_code
WHERE b.is_active AND m.is_active
ORDER BY b.sort, m.sort;

-- ملخص الحجز مع عدد الخدمات
CREATE VIEW v_bookings_summary AS
SELECT bk.*,
       (SELECT count(*) FROM booking_items bi WHERE bi.booking_id = bk.id) AS items_count
FROM bookings bk;

COMMIT;
