-- ============================================================================
--  ABH AUTO — SEED 04 : offers, packages, projects, testimonials, stats, faq
-- ============================================================================
BEGIN;

-- ── العروض (الصفحة الرئيسية) ─────────────────────────────────────────────────
INSERT INTO offers (collection, slug, title, copy, discount_label, image, sort) VALUES
('home','luxury-ceramic','{"en":"Luxury Ceramic Suite","ar":"باقة السيراميك الفاخر"}',
 '{"en":"Deep gloss, easier maintenance, and a refined finish delivered with expert application.","ar":"حماية بلمعان عميق، ولمسة نهائية سهلة العناية، مع تنفيذ احترافي."}','-25%','/images/offer-1.webp',1),
('home','summer-shield','{"en":"Summer Shield Program","ar":"برنامج درع الصيف"}',
 '{"en":"A smart choice for heat, UV exposure, and dust — with enhanced interior care.","ar":"حلول مناسبة للحرارة والأشعة فوق البنفسجية والغبار، مع عناية داخلية محسّنة."}','-18%','/images/offer-2.webp',2),
('home','elite-membership','{"en":"Elite Membership","ar":"عضوية النخبة"}',
 '{"en":"Priority booking, dedicated follow-up, and year-round advisory support.","ar":"أولوية في الحجز، متابعة خاصة، وخدمة استشارية مخصصة على مدار العام."}','VIP','/images/offer-3.webp',3);

-- ── العروض (المجموعة الكاملة) ────────────────────────────────────────────────
INSERT INTO offers (collection, slug, tag, title, copy, discount_label, image, sort) VALUES
('all','summer-ceramic-shield','{"en":"Seasonal","ar":"موسمي"}','{"en":"Summer Ceramic Shield","ar":"درع السيراميك الصيفي"}',
 '{"en":"UV-rated ceramic with hydrophobic glass — built for the Gulf summer.","ar":"سيراميك مقاوم للأشعة فوق البنفسجية مع زجاج طارد للماء — لصيف الخليج."}','18% Off','/images/offer-1.webp',1),
('all','diamond-protection','{"en":"Flagship","ar":"الأفخم"}','{"en":"Diamond Protection Suite","ar":"باقة حماية الألماس"}',
 '{"en":"A twelve-layer nano-ceramic system applied in a class-1000 cleanroom.","ar":"نظام نانو سيراميك من ١٢ طبقة يُطبَّق في غرفة نظيفة Class-1000."}','25% Off','/images/offer-2.webp',2),
('all','full-body-film','{"en":"Film","ar":"فيلم"}','{"en":"Full-Body Paint Film","ar":"حماية كاملة لطلاء الجسم"}',
 '{"en":"Bumper-to-bumper self-healing PPF, precision-cut and near invisible.","ar":"فيلم PPF ذاتي الإصلاح من الصدام للصدام، مقصوص بدقة وشبه خفي."}','15% Off','/images/offer-3.webp',3),
('all','ceramic-tint-bundle','{"en":"Bundle","ar":"باقة"}','{"en":"Ceramic + Tint Bundle","ar":"سيراميك + عازل"}',
 '{"en":"9H ceramic paired with IR-rejecting ceramic window film.","ar":"سيراميك 9H مع عازل نوافذ سيراميك يصدّ الأشعة تحت الحمراء."}','20% Off','/images/offer-1.webp',4),
('all','cabin-revival','{"en":"Interior","ar":"داخلي"}','{"en":"Cabin Revival","ar":"إنعاش المقصورة"}',
 '{"en":"Full interior steam, leather conditioning and ceramic fabric guard.","ar":"بخار كامل للداخلية، عناية بالجلد وحماية سيراميك للأقمشة."}','12% Off','/images/offer-2.webp',5),
('all','wheel-caliper-ceramic','{"en":"Wheels","ar":"جنوط"}','{"en":"Wheel & Caliper Ceramic","ar":"سيراميك الجنوط والكاليبر"}',
 '{"en":"Heat-resistant ceramic on wheel faces, barrels and calipers.","ar":"سيراميك مقاوم للحرارة على واجهات الجنوط والبراميل والكاليبرات."}','22% Off','/images/offer-3.webp',6);

-- ── الباقات (صفحة العروض) ────────────────────────────────────────────────────
INSERT INTO packages (slug, name, copy, lead, terms, is_featured, sort) VALUES
('summer','{"en":"Summer Shield Program","ar":"برنامج درع الصيف"}',
 '{"en":"UV-rated ceramic + full interior conditioning for desert climates.","ar":"سيراميك مقاوم للأشعة فوق البنفسجية وتهيئة كاملة للمقصورة في المناخات الصحراوية."}',
 '{"en":"Engineered for the harshness of the Gulf summer — protecting paint from UV, conditioning the cabin against heat, with a hydrophobic layer that keeps the car cleaner for longer.","ar":"برنامجٌ مصمّم لقسوة الصيف الخليجي — يحمي الطلاء من الأشعة، ويهيّئ المقصورة لتقاوم الحرارة، مع طبقة طاردة للماء تُبقي السيارة نظيفة لفترة أطول."}',
 '{"en":"Limited-time offer. Prices start from the figure shown and vary by vehicle size and condition.","ar":"العرض ساري لفترة محدودة. الأسعار تبدأ من القيمة المذكورة وتختلف حسب حجم السيارة وحالتها."}', false, 1),
('diamond','{"en":"Diamond Ceramic Suite","ar":"باقة سيراميك الألماس"}',
 '{"en":"12-year nano-ceramic with optical clarity and a self-healing topcoat.","ar":"طبقة نانو سيراميك تدوم ١٢ عاماً مع نقاء بصري وطبقة ذاتية الإصلاح."}',
 '{"en":"The finest we offer. A 12-layer nano-ceramic system applied in a cleanroom — unmatched optical depth and protection documented for ten years.","ar":"أرفع ما نقدّمه. منظومة نانو سيراميك من ١٢ طبقة تُطبَّق في غرفة نظيفة، تمنح عمقاً بصرياً لا يضاهى وحماية موثّقة لعشر سنوات."}',
 '{"en":"The most chosen among our clients. Prices start from the figure shown and are finalized after assessment.","ar":"الأكثر اختياراً بين عملائنا. الأسعار تبدأ من القيمة المذكورة وتُحدّد نهائياً بعد المعاينة."}', true, 2),
('elite','{"en":"Elite Membership","ar":"عضوية النخبة"}',
 '{"en":"Annual access to a private technician team, valet pickup and global insurance.","ar":"وصول سنوي إلى فريق فنّي خاص، خدمة فاليه واستلام عالمي وتأمين دولي."}',
 '{"en":"Not a package — a relationship. Unlimited annual access to the atelier, a team dedicated to your cars, and a concierge that handles everything, wherever you are.","ar":"ليست باقة، بل علاقة. وصولٌ سنوي غير محدود إلى الأتيليه، بفريق مخصّص لسياراتك، وخدمة متابعة خاصة تتولّى كل شيء — أينما كنت."}',
 '{"en":"Membership is by invitation and assessment. Value is set by collection size and scope of service.","ar":"العضوية بالدعوة والتقييم. تُحدّد القيمة حسب حجم المجموعة ونطاق الخدمة."}', false, 3);

INSERT INTO package_features (package_id, label, sort)
SELECT p.id, x.label, x.sort FROM packages p JOIN (VALUES
 ('summer','{"en":"UV-rated ceramic","ar":"سيراميك مقاوم UV"}'::jsonb,1),
 ('summer','{"en":"Full interior prep","ar":"تهيئة كاملة للمقصورة"}'::jsonb,2),
 ('summer','{"en":"Heat protection","ar":"حماية من الحرارة"}'::jsonb,3),
 ('summer','{"en":"One maintenance session","ar":"جلسة صيانة واحدة"}'::jsonb,4),
 ('diamond','{"en":"12-layer nano-ceramic","ar":"نانو سيراميك ١٢ طبقة"}'::jsonb,1),
 ('diamond','{"en":"10-year warranty","ar":"ضمان ١٠ سنوات"}'::jsonb,2),
 ('diamond','{"en":"Self-healing topcoat","ar":"طبقة ذاتية الإصلاح"}'::jsonb,3),
 ('diamond','{"en":"Class-1000 cleanroom","ar":"غرفة نظيفة ١٠٠٠"}'::jsonb,4),
 ('diamond','{"en":"Multi-stage correction","ar":"تصحيح متعدد المراحل"}'::jsonb,5),
 ('elite','{"en":"Dedicated technician team","ar":"فريق فني مخصّص"}'::jsonb,1),
 ('elite','{"en":"Valet pickup & delivery","ar":"استلام وتسليم فاليه"}'::jsonb,2),
 ('elite','{"en":"Global coverage","ar":"تغطية دولية"}'::jsonb,3),
 ('elite','{"en":"Absolute booking priority","ar":"أولوية مطلقة في المواعيد"}'::jsonb,4),
 ('elite','{"en":"Work insured","ar":"تأمين على الأعمال"}'::jsonb,5)
) x(slug,label,sort) ON x.slug = p.slug;

INSERT INTO package_includes (package_id, label, sort)
SELECT p.id, x.label, x.sort FROM packages p JOIN (VALUES
 ('summer','{"en":"UV ceramic layer, 3-year warranty","ar":"طبقة سيراميك UV بضمان ٣ سنوات"}'::jsonb,1),
 ('summer','{"en":"Full interior deep-clean & wrap","ar":"تنظيف وتغليف كامل للمقصورة"}'::jsonb,2),
 ('summer','{"en":"Leather & surface treatment","ar":"معالجة الجلد والأسطح"}'::jsonb,3),
 ('summer','{"en":"Hydrophobic glass coating","ar":"طبقة طاردة للأمطار على الزجاج"}'::jsonb,4),
 ('summer','{"en":"Full technical inspection","ar":"فحص فني شامل"}'::jsonb,5),
 ('summer','{"en":"Free maintenance session at 6 months","ar":"جلسة صيانة مجانية بعد ٦ أشهر"}'::jsonb,6),
 ('diamond','{"en":"Multi-stage paint correction","ar":"تصحيح طلاء متعدد المراحل"}'::jsonb,1),
 ('diamond','{"en":"12 nano-ceramic layers","ar":"١٢ طبقة نانو سيراميك"}'::jsonb,2),
 ('diamond','{"en":"Self-healing topcoat","ar":"طبقة علوية ذاتية الإصلاح"}'::jsonb,3),
 ('diamond','{"en":"Class-1000 cleanroom application","ar":"معالجة في غرفة نظيفة فئة ١٠٠٠"}'::jsonb,4),
 ('diamond','{"en":"Independent UV rating","ar":"تقييم UV مستقل"}'::jsonb,5),
 ('diamond','{"en":"10-year manufacturer warranty","ar":"ضمان مصنع ١٠ سنوات"}'::jsonb,6),
 ('diamond','{"en":"Documented dossier with the car","ar":"ملف موثّق يرافق السيارة"}'::jsonb,7),
 ('diamond','{"en":"Two annual maintenance sessions","ar":"جلستا صيانة سنوية"}'::jsonb,8),
 ('elite','{"en":"Unlimited sessions per year","ar":"عدد غير محدود من الجلسات سنوياً"}'::jsonb,1),
 ('elite','{"en":"Dedicated team for your collection","ar":"فريق فني مخصّص لمجموعتك"}'::jsonb,2),
 ('elite','{"en":"Private valet pickup & delivery","ar":"استلام وتسليم فاليه خاص"}'::jsonb,3),
 ('elite','{"en":"Direct line, 24/7","ar":"خط مباشر ٢٤/٧"}'::jsonb,4),
 ('elite','{"en":"Absolute booking priority","ar":"أولوية مطلقة في الحجز"}'::jsonb,5),
 ('elite','{"en":"International coverage & pickup","ar":"تغطية واستلام دولي"}'::jsonb,6),
 ('elite','{"en":"All work fully insured","ar":"تأمين على جميع الأعمال"}'::jsonb,7),
 ('elite','{"en":"Invitations to private events","ar":"دعوات لفعاليات خاصة"}'::jsonb,8)
) x(slug,label,sort) ON x.slug = p.slug;

INSERT INTO package_steps (package_id, title, description, sort)
SELECT p.id, x.title, x.descr, x.sort FROM packages p JOIN (VALUES
 ('summer','{"en":"Intake & assessment","ar":"الاستلام والتقييم"}'::jsonb,'{"en":"Paint and interior condition inspected and documented.","ar":"فحص حالة الطلاء والمقصورة وتوثيقها."}'::jsonb,1),
 ('summer','{"en":"Preparation","ar":"التحضير"}'::jsonb,'{"en":"Detailed wash, decontamination, old wax removal.","ar":"غسيل تفصيلي وإزالة الملوّثات والتشميع القديم."}'::jsonb,2),
 ('summer','{"en":"Application","ar":"التطبيق"}'::jsonb,'{"en":"UV-resistant ceramic layer + interior conditioning.","ar":"طبقة السيراميك المقاومة للأشعة وتهيئة المقصورة."}'::jsonb,3),
 ('summer','{"en":"Delivery","ar":"التسليم"}'::jsonb,'{"en":"Final inspection under light + warranty card.","ar":"فحص نهائي تحت الضوء وتسليم بطاقة الضمان."}'::jsonb,4),
 ('diamond','{"en":"Diagnosis & documentation","ar":"التشخيص والتوثيق"}'::jsonb,'{"en":"Every panel inspected under polarized light, state photographed.","ar":"فحص كل لوحة تحت ضوء مستقطب وتصوير الحالة."}'::jsonb,1),
 ('diamond','{"en":"Correction","ar":"التصحيح"}'::jsonb,'{"en":"Scratches and swirls removed across three stages.","ar":"إزالة الخدوش والدوامات على ثلاث مراحل."}'::jsonb,2),
 ('diamond','{"en":"Application","ar":"التطبيق"}'::jsonb,'{"en":"12 ceramic layers, 12-hour cure per coat.","ar":"١٢ طبقة سيراميك بزمن تماسك ١٢ ساعة لكل طبقة."}'::jsonb,3),
 ('diamond','{"en":"Final inspection","ar":"الفحص النهائي"}'::jsonb,'{"en":"Reviewed under light, documented dossier delivered.","ar":"مراجعة تحت الضوء وتسليم الملف الموثّق."}'::jsonb,4),
 ('elite','{"en":"Private conversation","ar":"محادثة خاصة"}'::jsonb,'{"en":"An introductory session to understand your collection.","ar":"جلسة تعارف لفهم مجموعتك واحتياجاتك."}'::jsonb,1),
 ('elite','{"en":"Programming","ar":"وضع البرنامج"}'::jsonb,'{"en":"A bespoke annual plan designed per car.","ar":"تصميم خطة سنوية مخصّصة لكل سيارة."}'::jsonb,2),
 ('elite','{"en":"Activation","ar":"التفعيل"}'::jsonb,'{"en":"Your dedicated team and concierge are assigned, and service begins.","ar":"تخصيص الفريق والكونسيرج الخاص وبدء الخدمة."}'::jsonb,3),
 ('elite','{"en":"Stewardship","ar":"المتابعة"}'::jsonb,'{"en":"Ongoing management and periodic reports per car.","ar":"إدارة مستمرة وتقارير دورية عن كل سيارة."}'::jsonb,4)
) x(slug,title,descr,sort) ON x.slug = p.slug;

-- مصفوفة المقارنة
INSERT INTO package_comparison (label, summer, diamond, elite, sort) VALUES
('{"en":"Manufacturer warranty","ar":"ضمان مصنع"}','{"en":"3 yrs","ar":"٣ سنوات"}','{"en":"10 yrs","ar":"١٠ سنوات"}','{"en":"10 yrs+","ar":"١٠ سنوات+"}',1),
('{"en":"Ceramic layers","ar":"عدد الطبقات"}','{"en":"—","ar":"—"}','{"en":"12","ar":"١٢"}','{"en":"Bespoke","ar":"حسب الطلب"}',2),
('{"en":"Cleanroom","ar":"غرفة نظيفة"}','{"en":"no","ar":"no"}','{"en":"yes","ar":"yes"}','{"en":"yes","ar":"yes"}',3),
('{"en":"Valet service","ar":"خدمة فاليه"}','{"en":"no","ar":"no"}','{"en":"no","ar":"no"}','{"en":"yes","ar":"yes"}',4),
('{"en":"Global coverage","ar":"تغطية دولية"}','{"en":"no","ar":"no"}','{"en":"no","ar":"no"}','{"en":"yes","ar":"yes"}',5),
('{"en":"24/7 access","ar":"كونسيرج ٢٤/٧"}','{"en":"no","ar":"no"}','{"en":"no","ar":"no"}','{"en":"yes","ar":"yes"}',6);

-- ── المشاريع ────────────────────────────────────────────────────────────────
INSERT INTO projects (slug, title, category_label, craft, year, image_after, image_before, sort) VALUES
('pagani-huayra','Pagani Huayra','{"en":"Carbon Restoration","ar":"ترميم كربون"}','detailing',2024,'/images/project-1.webp','/images/project-1-before.webp',1),
('rolls-royce-spectre','Rolls-Royce Spectre','{"en":"Diamond Suite","ar":"باقة الألماس"}','ceramic',2024,'/images/project-2.webp','/images/project-2-before.webp',2),
('ferrari-sf90','Ferrari SF90','{"en":"Track Specification","ar":"مواصفات الحلبة"}','ppf',2023,'/images/project-3.webp','/images/project-3-before.webp',3),
('bentley-bacalar','Bentley Bacalar','{"en":"Concours Prep","ar":"تحضير كونكور"}','detailing',2024,'/images/project-4.webp','/images/project-4-before.webp',4),
('aston-martin-dbx','Aston Martin DBX','{"en":"Armored B6","ar":"تدريع B6"}','armor',2023,'/images/project-5.webp','/images/project-5-before.webp',5),
('porsche-911-gt3','Porsche 911 GT3','{"en":"PPF Application","ar":"تطبيق أفلام الحماية"}','ppf',2024,'/images/project-6.webp','/images/project-6-before.webp',6),
('mercedes-amg-g63','Mercedes-AMG G63','{"en":"Stealth Tracking","ar":"تتبّع خفي"}','tracking',2023,'/images/project-7.webp','/images/project-7-before.webp',7),
('lamborghini-revuelto','Lamborghini Revuelto','{"en":"Ceramic · 12yr","ar":"سيراميك · ١٢ سنة"}','ceramic',2024,'/images/project-8.webp','/images/project-8-before.webp',8);

-- مواصفات افتراضية لكل مشروع (من i18n projects.mSpecs)
INSERT INTO project_specs (project_id, label, value, sort)
SELECT p.id, x.label, x.value, x.sort FROM projects p CROSS JOIN (VALUES
 ('{"en":"Duration","ar":"المدة"}'::jsonb,'{"en":"240 hrs","ar":"٢٤٠ ساعة"}'::jsonb,1),
 ('{"en":"Layers","ar":"الطبقات"}'::jsonb,'{"en":"12","ar":"١٢"}'::jsonb,2),
 ('{"en":"Warranty","ar":"الضمان"}'::jsonb,'{"en":"10 yrs","ar":"١٠ سنوات"}'::jsonb,3),
 ('{"en":"Bay","ar":"الورشة"}'::jsonb,'{"en":"Private","ar":"خاصة"}'::jsonb,4)
) x(label,value,sort);

-- خطوات افتراضية لكل مشروع (من i18n projects.mSteps)
INSERT INTO project_steps (project_id, title, description, sort)
SELECT p.id, x.title, x.descr, x.sort FROM projects p CROSS JOIN (VALUES
 ('{"en":"Diagnosis & documentation","ar":"تشخيص وتوثيق"}'::jsonb,'{"en":"Every panel inspected under polarized light; the initial state fully photographed.","ar":"فحص كل لوحة تحت ضوء مستقطب، وتصوير الحالة الأولية بالكامل."}'::jsonb,1),
 ('{"en":"Multi-stage correction","ar":"تصحيح متعدد المراحل"}'::jsonb,'{"en":"Micro-scratches and swirls removed across three measured stages.","ar":"إزالة الخدوش الدقيقة والدوامات على ثلاث مراحل بالغرام."}'::jsonb,2),
 ('{"en":"Nano-ceramic application","ar":"تطبيق النانو سيراميك"}'::jsonb,'{"en":"12 layers in a cleanroom, with a 12-hour cure per coat.","ar":"١٢ طبقة في غرفة نظيفة، بزمن تماسك ١٢ ساعة لكل طبقة."}'::jsonb,3),
 ('{"en":"Final inspection","ar":"الفحص النهائي"}'::jsonb,'{"en":"Reviewed under light; the documented dossier delivered with the car.","ar":"مراجعة تحت الضوء، وتسليم الملف الموثّق مع السيارة."}'::jsonb,4)
) x(title,descr,sort);

-- ── آراء العملاء ────────────────────────────────────────────────────────────
INSERT INTO testimonials (name, role, quote, rating, avatar_url, sort) VALUES
('Khalid Al Mansouri','{"en":"Private Collector","ar":"جامع خاص"}',
 '{"en":"They treated my 250 GTO with the reverence of curators. Every panel inspected, every decision documented. I trust no one else.","ar":"عاملوا سيارتي 250 GTO باحترام القيّمين على المتاحف. كل لوحة فُحصت، وكل قرار وُثّق. لا أثق بأحد سواهم."}',
 5,'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=75',1),
('Alessandra Romano','{"en":"CEO, Romano Holdings","ar":"الرئيسة التنفيذية، Romano Holdings"}',
 '{"en":"The workshop in Milan is run with the precision of a Swiss workshop and the discretion of a private bank. Unparalleled.","ar":"تُدار الورشة في ميلانو بدقة ورشة سويسرية وكتمان مصرف خاص. لا مثيل لها."}',
 5,'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=75',2),
('Hisham Al Sayed','{"en":"Founder, AS Capital","ar":"المؤسس، AS Capital"}',
 '{"en":"After eight years of partnership, my entire stable is in their care. They know each car by name and history.","ar":"بعد ثماني سنوات من الشراكة، أصبح أسطولي كله في عنايتهم. يعرفون كل سيارة بالاسم والتاريخ."}',
 5,'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=75',3),
('Yuki Tanaka','{"en":"Industrial Designer","ar":"مصمم صناعي"}',
 '{"en":"I have worked with master craftsmen in Kyoto. The work I have seen here is at that level. The standard is exceptional.","ar":"عملت مع حرفيين مهرة في كيوتو. ما رأيته هنا في المستوى ذاته. المعيار استثنائي."}',
 5,'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=200&q=75',4),
('Reem Al Otaibi','{"en":"Private Aviation","ar":"طيران خاص"}',
 '{"en":"They protected our entire fleet — including the Phantom and the Cullinan — without a single complaint in three years.","ar":"حموا أسطولنا بالكامل — بما في ذلك الفانتوم والكولينان — دون أي شكوى خلال ثلاث سنوات."}',
 5,'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=75',5);

-- ── الإحصاءات ───────────────────────────────────────────────────────────────
INSERT INTO stats (code, value, suffix, label, sort) VALUES
('cars',    12480, '+', '{"en":"Cars Protected","ar":"سيارة خضعت للحماية"}', 1),
('clients',  3890, '+', '{"en":"Happy Clients","ar":"عميل سعيد"}', 2),
('cities',     42, '',  '{"en":"City Served","ar":"مدينة نخدمها"}', 3),
('years',      18, '',  '{"en":"Years of Experience","ar":"سنوات من الخبرة"}', 4);

-- ── الأسئلة الشائعة ─────────────────────────────────────────────────────────
INSERT INTO faqs (question, answer, sort) VALUES
('{"en":"What warranty do you offer?","ar":"ما نوع الضمان الذي تقدمونه؟"}',
 '{"en":"Warranty length depends on the service and package, and we confirm it in writing before work begins.","ar":"تختلف مدة الضمان حسب الخدمة والباقة، ونوضحها كتابةً قبل البدء."}',1),
('{"en":"How long does ceramic coating last?","ar":"كم تدوم طبقة السيراميك؟"}',
 '{"en":"That depends on the package, the way the car is used, and how well post-installation care is followed.","ar":"يعتمد ذلك على نوع الباقة، وطريقة الاستخدام، والالتزام بالتعليمات بعد التركيب."}',2),
('{"en":"How long does the work take?","ar":"كم يستغرق التنفيذ؟"}',
 '{"en":"Timing varies by service type and project scope, and we confirm the schedule before booking.","ar":"تختلف المدة حسب حجم العمل ونوع الخدمة، ونحددها لك قبل الحجز."}',3),
('{"en":"Does the car need special care after installation?","ar":"هل تحتاج السيارة لعناية خاصة بعد التركيب؟"}',
 '{"en":"We provide simple, clear aftercare guidance to help preserve the result.","ar":"نقدم لك تعليمات بسيطة وواضحة للعناية بعد التسليم للحفاظ على أفضل نتيجة."}',4),
('{"en":"How is pricing determined?","ar":"كيف يتم تسعير الخدمات؟"}',
 '{"en":"Pricing depends on the vehicle, the scope of work, and the selected package, all discussed in advance.","ar":"السعر يعتمد على نوع السيارة، ونطاق العمل، والحزمة المطلوبة، ويتم توضيحه مسبقًا."}',5),
('{"en":"Do you offer pickup and delivery?","ar":"هل توجد خدمة استلام وتسليم؟"}',
 '{"en":"Yes — pickup, delivery, and special scheduling are available by arrangement.","ar":"نعم، تتوفر خدمة استلام وتسليم وترتيب خاص حسب المواعيد."}',6);

-- ── شريط الماركيه ───────────────────────────────────────────────────────────
INSERT INTO marquee_items (label, sort) VALUES
('{"en":"Nano Ceramic","ar":"نانو سيراميك"}',1),
('{"en":"Paint Protection Film","ar":"أفلام حماية الطلاء"}',2),
('{"en":"Armored Protection","ar":"حماية بالستية"}',3),
('{"en":"Precision Detailing","ar":"تلميع احترافي"}',4),
('{"en":"Smart Tracking","ar":"تتبّع ذكي"}',5),
('{"en":"Luxury Interior Care","ar":"عناية داخلية فاخرة"}',6);

COMMIT;
