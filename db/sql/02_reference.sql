-- ============================================================================
--  ABH AUTO — SEED DATA  (PostgreSQL 16)
--  كل المحتوى مأخوذ حرفيًا من ملفات المشروع (booking-data / services-data /
--  site-config / ar.json / en.json). شغّله بعد 01_schema.sql
-- ============================================================================

BEGIN;

-- ── 1. أحجام السيارات ───────────────────────────────────────────────────────
INSERT INTO vehicle_sizes (code, name, examples, multiplier, sort) VALUES
('small',  '{"en":"Small","ar":"صغير"}',  '{"en":"Sedan, Coupe","ar":"سيدان، كوبيه"}', 1.00, 1),
('medium', '{"en":"Medium","ar":"متوسط"}', '{"en":"SUV, Crossover","ar":"دفع رباعي"}',   1.25, 2),
('large',  '{"en":"Large","ar":"كبير"}',  '{"en":"Full-size SUV","ar":"SUV كبير"}',     1.55, 3);

-- ── 2. الألوان ──────────────────────────────────────────────────────────────
INSERT INTO colors (code, name, hex, is_light, sort) VALUES
('white',  '{"en":"Pearl White","ar":"أبيض لؤلؤي"}',           '#f3f3f1', true,  1),
('black',  '{"en":"Obsidian Black","ar":"أسود فاحم"}',          '#0a0a0b', false, 2),
('silver', '{"en":"Titanium Silver","ar":"فضّي تيتانيوم"}',      '#c7c9cb', true,  3),
('gray',   '{"en":"Graphite Gray","ar":"رمادي جرافيت"}',        '#6b6e72', false, 4),
('red',    '{"en":"Crimson Red","ar":"أحمر قرمزي"}',            '#7c1a1a', false, 5),
('blue',   '{"en":"Midnight Blue","ar":"أزرق ليلي"}',           '#1b2a44', false, 6),
('green',  '{"en":"British Racing Green","ar":"أخضر سباقات بريطاني"}', '#1c3a2e', false, 7),
('yellow', '{"en":"Solar Yellow","ar":"أصفر شمسي"}',            '#c9a227', true,  8),
('orange', '{"en":"Burnt Orange","ar":"برتقالي محروق"}',        '#9c4416', false, 9),
('brown',  '{"en":"Cognac Brown","ar":"بنّي كونياك"}',          '#4a3526', false, 10),
('beige',  '{"en":"Champagne Beige","ar":"بيج شامبين"}',        '#cdbfa3', true,  11),
('gold',   '{"en":"Champagne Gold","ar":"ذهبي شامبين"}',        '#b8993f', true,  12);

-- ── 3. المدن ────────────────────────────────────────────────────────────────
INSERT INTO cities (code, name, sort) VALUES
('cairo',      '{"en":"Cairo","ar":"القاهرة"}', 1),
('alexandria', '{"en":"Alexandria","ar":"الإسكندرية"}', 2),
('giza',       '{"en":"Giza","ar":"الجيزة"}', 3),
('nasr_city',  '{"en":"Nasr City","ar":"مدينة نصر"}', 4),
('new_cairo',  '{"en":"New Cairo","ar":"القاهرة الجديدة"}', 5),
('maadi',      '{"en":"Maadi","ar":"المعادي"}', 6),
('zamalek',    '{"en":"Zamalek","ar":"الزمالك"}', 7),
('october',    '{"en":"6th of October","ar":"السادس من أكتوبر"}', 8);

-- ── 4. الفروع ───────────────────────────────────────────────────────────────
INSERT INTO branches (code, name, city_code, sort) VALUES
('nasr_city',  '{"en":"Nasr City Branch","ar":"فرع مدينة نصر"}',       'nasr_city', 1),
('new_cairo',  '{"en":"New Cairo Branch","ar":"فرع القاهرة الجديدة"}', 'new_cairo', 2),
('alexandria', '{"en":"Alexandria Branch","ar":"فرع الإسكندرية"}',     'alexandria', 3);

-- ── 5. الماركات والموديلات ───────────────────────────────────────────────────
INSERT INTO brands (id, name, sort) VALUES
('rolls','Rolls-Royce',1),('bentley','Bentley',2),('ferrari','Ferrari',3),
('lamborghini','Lamborghini',4),('porsche','Porsche',5),('mercedes','Mercedes-Benz',6),
('bmw','BMW',7),('aston','Aston Martin',8),('mclaren','McLaren',9),
('landrover','Land Rover',10),('pagani','Pagani',11),('cadillac','Cadillac',12);

INSERT INTO brand_models (brand_id, name, size_code, sort)
SELECT brand_id, model, 'large', ord FROM (VALUES
  ('rolls','Phantom',1),('rolls','Ghost',2),('rolls','Cullinan',3),('rolls','Spectre',4),('rolls','Wraith',5),('rolls','Dawn',6),
  ('bentley','Continental GT',1),('bentley','Flying Spur',2),('bentley','Bentayga',3),('bentley','Bacalar',4),('bentley','Mulsanne',5),
  ('ferrari','SF90',1),('ferrari','Roma',2),('ferrari','296 GTB',3),('ferrari','Purosangue',4),('ferrari','812',5),('ferrari','F8',6),
  ('lamborghini','Revuelto',1),('lamborghini','Huracán',2),('lamborghini','Urus',3),('lamborghini','Aventador',4),
  ('porsche','911',1),('porsche','Taycan',2),('porsche','Cayenne',3),('porsche','Panamera',4),('porsche','Macan',5),('porsche','718',6),
  ('mercedes','S-Class',1),('mercedes','G63 AMG',2),('mercedes','Maybach',3),('mercedes','GLS',4),('mercedes','SL',5),('mercedes','EQS',6),
  ('bmw','7 Series',1),('bmw','X7',2),('bmw','M5',3),('bmw','XM',4),('bmw','i7',5),('bmw','8 Series',6),
  ('aston','DBX',1),('aston','DB12',2),('aston','Vantage',3),('aston','Valhalla',4),
  ('mclaren','750S',1),('mclaren','Artura',2),('mclaren','GTS',3),('mclaren','720S',4),
  ('landrover','Range Rover',1),('landrover','Range Rover Sport',2),('landrover','Defender',3),('landrover','Velar',4),
  ('pagani','Huayra',1),('pagani','Utopia',2),
  ('cadillac','Escalade',1),('cadillac','CT5',2),('cadillac','Lyriq',3)
) AS t(brand_id, model, ord);

-- ── 6. طرق الدفع ────────────────────────────────────────────────────────────
INSERT INTO payment_methods (code, name, description, sort) VALUES
('tabby',    '{"en":"Tabby","ar":"Tabby"}',           '{"en":"Pay in 4 installments, interest-free.","ar":"ادفع على ٤ دفعات بدون فوائد."}', 1),
('tamara',   '{"en":"Tamara","ar":"Tamara"}',         '{"en":"Split into 3 easy payments.","ar":"قسّمها على ٣ دفعات ميسّرة."}', 2),
('applePay', '{"en":"Apple Pay","ar":"Apple Pay"}',   '{"en":"Fast, secure payment with Face ID.","ar":"دفع سريع وآمن عبر Face ID."}', 3),
('cash',     '{"en":"Cash at Branch","ar":"كاش في الفرع"}', '{"en":"Pay when you arrive at the branch.","ar":"ادفع عند وصولك إلى الفرع."}', 4);

-- ── 7. خيارات السطحة ────────────────────────────────────────────────────────
INSERT INTO towing_options (code, name, cost, sort) VALUES
('oneway', '{"en":"One-Way","ar":"ذهاب"}',        300, 1),
('return', '{"en":"Return Trip","ar":"عودة"}',     300, 2),
('both',   '{"en":"Both Ways","ar":"ذهاب وعودة"}', 550, 3);

-- ── 8. المواعيد ─────────────────────────────────────────────────────────────
INSERT INTO time_slots (period, slot_time, sort) VALUES
('morning','09:00',1),('morning','10:30',2),('morning','12:00',3),
('afternoon','13:30',4),('afternoon','15:00',5),('afternoon','16:30',6),
('evening','18:00',7),('evening','19:30',8),('evening','21:00',9);

-- ============================================================================
--  9. فئات الخدمات
-- ============================================================================
-- فئات الحجز (booking)
INSERT INTO service_categories (surface, slug, name, icon, sort) VALUES
('booking','packages',  '{"en":"Packages","ar":"الباقات"}',     'star',     1),
('booking','ceramic',   '{"en":"Nano Ceramic","ar":"نانو سيراميك"}', 'shield', 2),
('booking','ppf',       '{"en":"Paint Film","ar":"حماية الطلاء"}', 'layers',  3),
('booking','thermal',   '{"en":"Heat & Tint","ar":"العزل الحراري"}', 'sun',    4),
('booking','protection','{"en":"Protection","ar":"الحماية"}',    'lock',     5),
('booking','addons',    '{"en":"Add-ons","ar":"خدمات إضافية"}',  'sparkles', 6);

-- فئات صفحة الخدمات (catalog)
INSERT INTO service_categories (surface, slug, name, tagline, numeral, sort) VALUES
('catalog','coatings',  '{"en":"Coatings","ar":"الطلاءات"}',  '{"en":"Ceramic & nano protection systems","ar":"أنظمة السيراميك والنانو"}', 'I',  1),
('catalog','protection','{"en":"Protection","ar":"الحماية"}', '{"en":"Paint protection film & armoring","ar":"أفلام الحماية والتدريع"}',   'II', 2),
('catalog','security',  '{"en":"Security","ar":"الأمان"}',    '{"en":"Smart tracking & access control","ar":"التتبع الذكي والتحكم"}',      'III',3),
('catalog','detailing', '{"en":"Detailing","ar":"التفاصيل"}', '{"en":"Paint correction & interior care","ar":"تصحيح الطلاء والعناية الداخلية"}', 'IV', 4),
('catalog','bundles',   '{"en":"Bundles","ar":"الباقات"}',    '{"en":"Complete protection packages","ar":"باقات الحماية الشاملة"}',         'V',  5);

-- ============================================================================
--  10. خدمات الحجز (booking surface) — booking-data SERVICES
-- ============================================================================
INSERT INTO services (category_id, surface, slug, name, description, image, badge, duration, warranty_duration, pricing_model, base_price, old_base_price, is_on_request, is_featured, sort) VALUES
((SELECT id FROM service_categories WHERE surface='booking' AND slug='packages'),'booking','pkg_diamond',
 '{"en":"Diamond Suite","ar":"باقة الألماس"}',
 '{"en":"Our flagship 12-layer nano-ceramic system applied in a class-1000 cleanroom.","ar":"نظام النانو سيراميك الرائد لدينا من ١٢ طبقة، يُطبَّق في غرفة نظيفة من الفئة 1000."}',
 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"3–4 days","ar":"٣–٤ أيام"}', '{"en":"10 yrs","ar":"10 سنوات"}', 'multiplier', 9800, 12500, false, true, 1),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='packages'),'booking','pkg_summer',
 '{"en":"Summer Shield","ar":"درع الصيف"}',
 '{"en":"UV-rated ceramic and full cabin conditioning, engineered for desert climates.","ar":"سيراميك مقاوم للأشعة فوق البنفسجية مع تكييف كامل للمقصورة، مصمّم لمناخ الصحراء."}',
 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"1–2 days","ar":"يوم–يومين"}', '{"en":"3 yrs","ar":"3 سنوات"}', 'multiplier', 4500, 5800, false, false, 2),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='packages'),'booking','pkg_elite',
 '{"en":"Elite Membership","ar":"عضوية النخبة"}',
 '{"en":"Unlimited annual access, a dedicated team, valet and 24/7 support.","ar":"وصول سنوي غير محدود، فريق مخصّص، خدمة صفّ السيارات وكونسيرج على مدار الساعة."}',
 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"Year-round","ar":"طوال العام"}', '{"en":"Annual","ar":"سنوي"}', 'on_request', NULL, NULL, true, false, 3),

((SELECT id FROM service_categories WHERE surface='booking' AND slug='ceramic'),'booking','cer_9h',
 '{"en":"9H Nano Ceramic","ar":"نانو سيراميك 9H"}',
 '{"en":"9H hardness ceramic for lasting depth of gloss and hydrophobic behaviour.","ar":"سيراميك بصلابة 9H لعمق لمعان دائم وخاصية طاردة للماء."}',
 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"12–24 hrs","ar":"١٢–٢٤ ساعة"}', '{"en":"5 yrs","ar":"5 سنوات"}', 'multiplier', 3200, 3900, false, true, 4),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='ceramic'),'booking','cer_graphene',
 '{"en":"Graphene Ceramic","ar":"سيراميك الجرافين"}',
 '{"en":"Graphene-infused coating with superior heat dissipation and water sheeting.","ar":"طلاء مدعّم بالجرافين بتشتيت حراري فائق وانسياب ممتاز للماء."}',
 'https://images.unsplash.com/photo-1605618826115-fb9e775cfa9e?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"1–2 days","ar":"يوم–يومين"}', '{"en":"7 yrs","ar":"7 سنوات"}', 'multiplier', 4600, NULL, false, false, 5),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='ceramic'),'booking','cer_wheel',
 '{"en":"Wheel & Caliper Ceramic","ar":"سيراميك الجنوط والكاليبر"}',
 '{"en":"Heat-resistant ceramic on wheel faces, barrels and calipers.","ar":"سيراميك مقاوم للحرارة على واجهات الجنوط والبراميل والكاليبرات."}',
 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"4–6 hrs","ar":"٤–٦ ساعات"}', '{"en":"2 yrs","ar":"سنتان"}', 'multiplier', 850, NULL, false, false, 6),

((SELECT id FROM service_categories WHERE surface='booking' AND slug='ppf'),'booking','ppf_full',
 '{"en":"Full-Body PPF","ar":"حماية كاملة للجسم PPF"}',
 '{"en":"Bumper-to-bumper precision-cut film, self-healing and near-invisible.","ar":"فيلم مقصوص بدقة من الصدام للصدام، ذاتي الإصلاح وشبه خفي."}',
 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"4–6 days","ar":"٤–٦ أيام"}', '{"en":"10 yrs","ar":"10 سنوات"}', 'multiplier', 6800, 8400, false, true, 7),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='ppf'),'booking','ppf_track',
 '{"en":"Track Pack PPF","ar":"باقة المسار PPF"}',
 '{"en":"High-impact zones — front end, rockers, mirrors — shielded for the road.","ar":"مناطق الاصطدام العالي — الأمام، العتبات، المرايا — محميّة للطريق."}',
 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"2–3 days","ar":"٢–٣ أيام"}', '{"en":"10 yrs","ar":"10 سنوات"}', 'multiplier', 3400, NULL, false, false, 8),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='ppf'),'booking','ppf_partial',
 '{"en":"Partial Front PPF","ar":"حماية أمامية جزئية PPF"}',
 '{"en":"Hood, fenders and bumper protection against stone chips.","ar":"حماية غطاء المحرك والرفارف والصدام من رذاذ الحصى."}',
 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"1–2 days","ar":"يوم–يومين"}', '{"en":"10 yrs","ar":"10 سنوات"}', 'multiplier', 2200, NULL, false, false, 9),

((SELECT id FROM service_categories WHERE surface='booking' AND slug='thermal'),'booking','tint_ceramic',
 '{"en":"Ceramic Window Tint","ar":"عازل نوافذ سيراميك"}',
 '{"en":"IR-rejecting ceramic tint that cuts cabin heat without going dark.","ar":"عازل سيراميك يصدّ الأشعة تحت الحمراء ويقلّل حرارة المقصورة دون تعتيم زائد."}',
 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"4–6 hrs","ar":"٤–٦ ساعات"}', '{"en":"Lifetime","ar":"مدى الحياة"}', 'multiplier', 1800, 2300, false, true, 10),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='thermal'),'booking','tint_windshield',
 '{"en":"Windshield Heat Film","ar":"فيلم حراري للزجاج الأمامي"}',
 '{"en":"Optically clear heat-rejection film for the windshield.","ar":"فيلم شفّاف بصرياً يصدّ الحرارة للزجاج الأمامي."}',
 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"2–3 hrs","ar":"٢–٣ ساعات"}', '{"en":"Lifetime","ar":"مدى الحياة"}', 'multiplier', 1100, NULL, false, false, 11),

((SELECT id FROM service_categories WHERE surface='booking' AND slug='protection'),'booking','prot_armor',
 '{"en":"Ballistic Armoring","ar":"تدريع مضاد للرصاص"}',
 '{"en":"Engineered ballistic protection with balanced weight and discretion.","ar":"حماية مضادة للرصاص مصمّمة بوزن متوازن وتكامل خفي."}',
 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"On consult","ar":"حسب المعاينة"}', '{"en":"Certified","ar":"معتمد"}', 'on_request', NULL, NULL, true, true, 12),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='protection'),'booking','prot_tracking',
 '{"en":"Smart Tracking","ar":"تتبّع ذكي"}',
 '{"en":"Low-profile GPS tracking with geofencing and instant alerts.","ar":"تتبّع GPS خفي مع سياج جغرافي وتنبيهات فورية."}',
 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"3–4 hrs","ar":"٣–٤ ساعات"}', '{"en":"2 yrs","ar":"سنتان"}', 'multiplier', 1400, NULL, false, false, 13),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='protection'),'booking','prot_security',
 '{"en":"Smart Security","ar":"أمان ذكي"}',
 '{"en":"Biometric ignition and app control with factory-clean integration.","ar":"تشغيل بصمة وتحكّم عبر التطبيق مع تكامل بمظهر المصنع."}',
 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"4–6 hrs","ar":"٤–٦ ساعات"}', '{"en":"2 yrs","ar":"سنتان"}', 'multiplier', 1900, NULL, false, false, 14),

((SELECT id FROM service_categories WHERE surface='booking' AND slug='addons'),'booking','add_detail',
 '{"en":"Full Detailing","ar":"تنظيف وتلميع شامل"}',
 '{"en":"Complete interior and exterior detailing with premium products.","ar":"عناية داخلية وخارجية كاملة بمنتجات فاخرة."}',
 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"6–8 hrs","ar":"٦–٨ ساعات"}', '{"en":"—","ar":"—"}', 'multiplier', 1400, 1800, false, false, 15),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='addons'),'booking','add_polish',
 '{"en":"Machine Polishing","ar":"تلميع آلي"}',
 '{"en":"Multi-stage correction to erase swirls, scratches and oxidation.","ar":"تصحيح متعدّد المراحل لإزالة الدوائر والخدوش والأكسدة."}',
 'https://images.unsplash.com/photo-1605164599901-db7f68c4b87a?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"4–6 hrs","ar":"٤–٦ ساعات"}', '{"en":"—","ar":"—"}', 'multiplier', 900, NULL, false, false, 16),
((SELECT id FROM service_categories WHERE surface='booking' AND slug='addons'),'booking','add_engine',
 '{"en":"Engine Bay Detail","ar":"تنظيف حجرة المحرك"}',
 '{"en":"Careful engine degrease and dressing for a showroom bay.","ar":"إزالة شحوم المحرك بعناية وتلميعها لمظهر صالة العرض."}',
 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=70&w=900', NULL,
 '{"en":"2–3 hrs","ar":"٢–٣ ساعات"}', '{"en":"—","ar":"—"}', 'multiplier', 450, NULL, false, false, 17);

-- includes لخدمات الحجز (الإنجليزية فقط — كما في الكود الأصلي؛ تُترجم لاحقًا)
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Multi-stage paint correction"}'::jsonb,1),('{"en":"12 nano-ceramic layers"}'::jsonb,2),
 ('{"en":"Self-healing topcoat"}'::jsonb,3),('{"en":"Documented dossier"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='pkg_diamond';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"UV-rated ceramic"}'::jsonb,1),('{"en":"Interior deep-clean"}'::jsonb,2),
 ('{"en":"Hydrophobic glass"}'::jsonb,3),('{"en":"6-month service"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='pkg_summer';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Unlimited sessions"}'::jsonb,1),('{"en":"Dedicated team"}'::jsonb,2),
 ('{"en":"Valet pickup"}'::jsonb,3),('{"en":"24/7 concierge"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='pkg_elite';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Single-stage correction"}'::jsonb,1),('{"en":"9H ceramic layer"}'::jsonb,2),
 ('{"en":"Hydrophobic finish"}'::jsonb,3),('{"en":"Cure & inspection"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='cer_9h';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Dual-stage correction"}'::jsonb,1),('{"en":"Graphene coating"}'::jsonb,2),
 ('{"en":"Reduced water spotting"}'::jsonb,3),('{"en":"Annual check"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='cer_graphene';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Wheels off"}'::jsonb,1),('{"en":"Barrel coating"}'::jsonb,2),
 ('{"en":"Caliper coating"}'::jsonb,3),('{"en":"Brake-dust resistance"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='cer_wheel';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Full bodywork wrap"}'::jsonb,1),('{"en":"Self-healing film"}'::jsonb,2),
 ('{"en":"Wrapped edges"}'::jsonb,3),('{"en":"Gloss or matte"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='ppf_full';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Full front end"}'::jsonb,1),('{"en":"Rocker panels"}'::jsonb,2),
 ('{"en":"Mirror caps"}'::jsonb,3),('{"en":"A-pillars & roof edge"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='ppf_track';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Partial hood"}'::jsonb,1),('{"en":"Front bumper"}'::jsonb,2),
 ('{"en":"Fender leading edges"}'::jsonb,3),('{"en":"Headlights"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='ppf_partial';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"All windows"}'::jsonb,1),('{"en":"99% UV block"}'::jsonb,2),
 ('{"en":"High IR rejection"}'::jsonb,3),('{"en":"Lifetime warranty"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='tint_ceramic';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Front windshield"}'::jsonb,1),('{"en":"Crystal-clear"}'::jsonb,2),
 ('{"en":"IR rejection"}'::jsonb,3),('{"en":"No signal loss"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='tint_windshield';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"B4–B6 options"}'::jsonb,1),('{"en":"Glass & body"}'::jsonb,2),
 ('{"en":"Run-flat tyres"}'::jsonb,3),('{"en":"Discreet integration"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='prot_armor';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Hidden install"}'::jsonb,1),('{"en":"Geofencing"}'::jsonb,2),
 ('{"en":"Instant alerts"}'::jsonb,3),('{"en":"Mobile app"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='prot_tracking';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Biometric ignition"}'::jsonb,1),('{"en":"App control"}'::jsonb,2),
 ('{"en":"Immobiliser"}'::jsonb,3),('{"en":"Factory look kept"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='prot_security';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Exterior decon"}'::jsonb,1),('{"en":"Interior steam"}'::jsonb,2),
 ('{"en":"Leather care"}'::jsonb,3),('{"en":"Final dressing"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='add_detail';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Paint reading"}'::jsonb,1),('{"en":"Compounding"}'::jsonb,2),
 ('{"en":"Polishing"}'::jsonb,3),('{"en":"Finishing"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='add_polish';
INSERT INTO service_includes (service_id, label, sort)
SELECT s.id, v.label, v.sort FROM services s, (VALUES
 ('{"en":"Degrease"}'::jsonb,1),('{"en":"Steam clean"}'::jsonb,2),
 ('{"en":"Dressing"}'::jsonb,3),('{"en":"Protection"}'::jsonb,4)) v(label,sort)
WHERE s.surface='booking' AND s.slug='add_engine';

-- أسعار خدمات الحجز محسوبة من base × multiplier (مقرّبة لأقرب 50) لكل حجم
INSERT INTO service_prices (service_id, size_code, price, old_price)
SELECT s.id, vs.code,
       round(s.base_price * vs.multiplier / 50) * 50,
       CASE WHEN s.old_base_price IS NOT NULL
            THEN round(s.old_base_price * vs.multiplier / 50) * 50 END
FROM services s CROSS JOIN vehicle_sizes vs
WHERE s.surface='booking' AND s.pricing_model='multiplier' AND s.base_price IS NOT NULL;

COMMIT;
