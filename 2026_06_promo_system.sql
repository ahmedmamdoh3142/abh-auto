-- ============================================================================
--  ABH AUTO — نظام أكواد الخصم (Promo) الاحترافي · Migration
--  آمن للتشغيل على قاعدة فيها promo_codes البسيط القديم (يرقّيه بدون فقد بيانات).
--  شغّله مرة واحدة. كل خطوة IF NOT EXISTS / guarded.
-- ============================================================================

BEGIN;

-- ── 1) نوع الكوبون (ENUM) ───────────────────────────────────────────────────
--   percentage      : نسبة % على إجمالي الطلب
--   fixed           : مبلغ ثابت على إجمالي الطلب
--   service_percent : خدمات محددة، نسبة % موحّدة عليها
--   service_each    : خدمات محددة، لكل خدمة نسبة% أو مبلغ خاص بها
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promo_kind') THEN
    CREATE TYPE public.promo_kind AS ENUM
      ('percentage', 'fixed', 'service_percent', 'service_each');
  END IF;
END$$;

-- ── 2) ترقية جدول promo_codes ───────────────────────────────────────────────
--   نضيف id مستقل (سيرفء كـ FK نظيف)، ونخلي code فريد بدل ما يكون PK نصّي.
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS id           uuid        DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS kind         public.promo_kind DEFAULT 'percentage' NOT NULL,
  ADD COLUMN IF NOT EXISTS label        text,                    -- اسم وصفي داخلي للكود
  ADD COLUMN IF NOT EXISTS description  text,                    -- ملاحظة اختيارية
  ADD COLUMN IF NOT EXISTS fixed_amount numeric(10,2) DEFAULT 0 NOT NULL, -- للنوع fixed
  ADD COLUMN IF NOT EXISTS min_order    numeric(10,2) DEFAULT 0 NOT NULL, -- حد أدنى للطلب
  ADD COLUMN IF NOT EXISTS per_user_limit integer,               -- حد لكل عميل (NULL=∞)
  ADD COLUMN IF NOT EXISTS starts_at    timestamptz,             -- تاريخ بداية (NULL=فوري)
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now() NOT NULL;

--   discount_percent كان NOT NULL ومقيّد 1..100 — نخفّف القيد لأن الأنواع الجديدة
--   (fixed / service_each) ممكن ما يكونش ليها نسبة إجمالية.
ALTER TABLE public.promo_codes ALTER COLUMN discount_percent DROP NOT NULL;
ALTER TABLE public.promo_codes ALTER COLUMN discount_percent SET DEFAULT 0;
--   احذف أي CHECK قديم على discount_percent مهما كان اسمه (متانة أعلى).
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE rel.relname = 'promo_codes' AND n.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%discount_percent%'
  LOOP
    EXECUTE format('ALTER TABLE public.promo_codes DROP CONSTRAINT %I', c.conname);
  END LOOP;
END$$;
--   قيد أوسع: النسبة (لو موجودة) بين 0 و100.
ALTER TABLE public.promo_codes
  ADD CONSTRAINT promo_codes_percent_range
  CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100));

--   نضمن قيمة id لكل الصفوف القديمة ثم نخليه فريد + فهرس.
UPDATE public.promo_codes SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE public.promo_codes ALTER COLUMN id SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='promo_codes_id_key') THEN
    ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_id_key UNIQUE (id);
  END IF;
END$$;
--   code يفضل فريد (هو PK حالياً) — كفاية. نخلي البحث عليه سريع وغير حسّاس لِلْكِيس.
CREATE INDEX IF NOT EXISTS promo_codes_code_lower_idx ON public.promo_codes (lower(code));

-- ── 3) جدول الخدمات المرتبطة بالكود (للنوعين service_percent / service_each) ──
--   value يحمل النسبة% (لو الكود نسبة) أو المبلغ الثابت (لو each بمبلغ).
--   amount_mode يفرّق: 'percent' أو 'fixed' لكل سطر (يدعم النوع الخامس البونص).
CREATE TABLE IF NOT EXISTS public.promo_code_services (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  promo_id    uuid    NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  service_id  integer NOT NULL REFERENCES public.services(id)    ON DELETE CASCADE,
  amount_mode text    NOT NULL DEFAULT 'percent',  -- 'percent' | 'fixed'
  value       numeric(10,2) NOT NULL DEFAULT 0,    -- نسبة% أو مبلغ حسب amount_mode
  UNIQUE (promo_id, service_id),
  CONSTRAINT promo_code_services_mode_chk CHECK (amount_mode IN ('percent','fixed')),
  CONSTRAINT promo_code_services_value_chk CHECK (value >= 0)
);
CREATE INDEX IF NOT EXISTS promo_code_services_promo_idx   ON public.promo_code_services(promo_id);
CREATE INDEX IF NOT EXISTS promo_code_services_service_idx ON public.promo_code_services(service_id);

-- ── 4) سجل الاستخدام (Redemptions) — قلب الإحصائيات ─────────────────────────
--   كل صف = مرة استخدام فعلية للكود في حجز. يخزّن لقطة المبالغ وقت الاستخدام.
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  promo_id      uuid    REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  code          text    NOT NULL,                 -- لقطة الكود (يفضل حتى لو اتحذف)
  booking_id    uuid    REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id       uuid    REFERENCES public.users(id)    ON DELETE SET NULL,
  customer_name  text,
  customer_email text,
  order_subtotal numeric(12,2) NOT NULL DEFAULT 0, -- إجمالي الطلب قبل الخصم
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,-- قيمة الخصم المطبّق
  order_total    numeric(12,2) NOT NULL DEFAULT 0, -- الإجمالي بعد الخصم
  redeemed_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS promo_redemptions_promo_idx ON public.promo_redemptions(promo_id);
CREATE INDEX IF NOT EXISTS promo_redemptions_code_idx  ON public.promo_redemptions(lower(code));
CREATE INDEX IF NOT EXISTS promo_redemptions_user_idx  ON public.promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS promo_redemptions_time_idx  ON public.promo_redemptions(redeemed_at);

-- ── 5) عمود لقطة على الحجز يوضّح نوع/قيمة الخصم (اختياري لكنه مفيد للتقارير) ──
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS promo_kind public.promo_kind;

COMMIT;

-- ============================================================================
--  ملاحظات:
--   • الأكواد القديمة تتحوّل تلقائيًا لنوع 'percentage' بقيمتها الحالية — تشتغل زي ما هي.
--   • used_count يفضل موجود للتوافق، لكن المصدر الحقيقي للإحصائيات هو promo_redemptions.
--   • لإعادة احتساب used_count من السجل (لو حبيت) — اختياري:
--       UPDATE promo_codes p SET used_count =
--         (SELECT count(*) FROM promo_redemptions r WHERE r.promo_id = p.id);
-- ============================================================================
