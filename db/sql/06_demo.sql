-- ============================================================================
--  ABH AUTO — SEED 06 : عضو تجريبي + الجراج + الحجوزات (لتشغيل الـAPIs فورًا)
--  ملاحظة: password_hash قيمة بديلة — استبدلها بـ hash حقيقي (bcrypt/argon2)
-- ============================================================================
BEGIN;

INSERT INTO users (id, name, email, phone, city_code, password_hash, member_since) VALUES
('11111111-1111-1111-1111-111111111111','Demo Member','demo@abh-auto.example','+20 100 000 0000','cairo',
 'REPLACE_WITH_BCRYPT_HASH', now() - interval '2 years')
ON CONFLICT (email) DO NOTHING;

INSERT INTO vehicles (id, user_id, brand_id, model, color_code, plate, year) VALUES
('22222222-2222-2222-2222-222222222221','11111111-1111-1111-1111-111111111111','rolls','Phantom','black','RUH 4471','2024'),
('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','bentley','Continental GT','white','JED 2208','2022')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings (id, reference, user_id, status, vehicle_label, plate, brand_id, model, size_code, color_code,
                      branch_code, scheduled_date, scheduled_time, payment_method_code, payment_status, stage) VALUES
('b0000001-0000-0000-0000-000000000001','ABH-DEMO1','11111111-1111-1111-1111-111111111111','upcoming',
 'Rolls-Royce Phantom','RUH 4471','rolls','Phantom','large','black','new_cairo', CURRENT_DATE + 6, '11:00', NULL, 'pay_at_branch', 0),
('b0000001-0000-0000-0000-000000000002','ABH-DEMO2','11111111-1111-1111-1111-111111111111','active',
 'Bentley Continental GT','JED 2208','bentley','Continental GT','large','white','nasr_city', CURRENT_DATE, '09:30', 'tabby', 'paid', 1),
('b0000001-0000-0000-0000-000000000003','ABH-DEMO3','11111111-1111-1111-1111-111111111111','completed',
 'Rolls-Royce Phantom','RUH 4471','rolls','Phantom','large','black','alexandria', CURRENT_DATE - 40, '13:00', 'applePay', 'paid', 4)
ON CONFLICT (reference) DO NOTHING;

INSERT INTO booking_items (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total)
SELECT 'b0000001-0000-0000-0000-000000000001', s.id, s.slug, s.name, 'large', sp.price, 1, sp.price
FROM services s JOIN service_prices sp ON sp.service_id = s.id AND sp.size_code='large'
WHERE s.surface='booking' AND s.slug IN ('pkg_diamond');

INSERT INTO booking_items (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total)
SELECT 'b0000001-0000-0000-0000-000000000002', s.id, s.slug, s.name, 'large', sp.price, 1, sp.price
FROM services s JOIN service_prices sp ON sp.service_id = s.id AND sp.size_code='large'
WHERE s.surface='booking' AND s.slug IN ('ppf_full','tint_ceramic');

INSERT INTO booking_items (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total)
SELECT 'b0000001-0000-0000-0000-000000000003', s.id, s.slug, s.name, 'large', sp.price, 1, sp.price
FROM services s JOIN service_prices sp ON sp.service_id = s.id AND sp.size_code='large'
WHERE s.surface='booking' AND s.slug IN ('add_detail','add_polish');

UPDATE bookings b SET
  subtotal = COALESCE((SELECT sum(line_total) FROM booking_items bi WHERE bi.booking_id = b.id), 0),
  total    = COALESCE((SELECT sum(line_total) FROM booking_items bi WHERE bi.booking_id = b.id), 0) + b.towing_cost
WHERE b.reference IN ('ABH-DEMO1','ABH-DEMO2','ABH-DEMO3');

INSERT INTO booking_status_history (booking_id, status, stage, note)
SELECT id, status, stage, 'Seeded demo booking' FROM bookings
WHERE reference IN ('ABH-DEMO1','ABH-DEMO2','ABH-DEMO3');

COMMIT;
