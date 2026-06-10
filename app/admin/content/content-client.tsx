"use client";
import React, { useMemo, useState } from "react";
import { card, SubHead, LocaleField, Pill, useToast, Ic, PageHeader, Chip } from "@/components/admin/ui";
import type { Loc } from "@/lib/admin/i18n-json";

type Block = { key: string; value: Loc };

/** يحوّل مفتاح زي "home.hero.title" لعنوان مقروء + قسم. */
function labelFor(key: string) {
  const parts = key.split(/[._-]/);
  const section = parts[0] || "عام";
  const SECTION_AR: Record<string, string> = { home: "الرئيسية", hero: "الواجهة", about: "من نحن", services: "الخدمات", contact: "اتصل بنا", footer: "التذييل", nav: "القائمة", cta: "دعوة للإجراء", why: "لماذا نحن", stats: "الأرقام", faq: "الأسئلة", offers: "العروض" };
  return { section: SECTION_AR[section] || section, title: parts.slice(1).join(" · ") || key };
}

export default function ContentClient({ initial }: { initial: Block[] }) {
  const toast = useToast();
  const [list, setList] = useState<Block[]>(initial);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const update = (key: string, value: Loc) => {
    setList((ls) => ls.map((b) => (b.key === key ? { ...b, value } : b)));
    setDirty((d) => ({ ...d, [key]: true }));
  };
  async function saveAll() {
    setSaving(true);
    const changed = list.filter((b) => dirty[b.key]);
    try {
      for (const b of changed) {
        const res = await fetch("/api/admin/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
        const data = await res.json();
        if (!data.ok) throw new Error();
      }
      setDirty({}); toast(`تم حفظ ${changed.length} نص`);
    } catch { toast("فشل الحفظ", "bad"); }
    setSaving(false);
  }
  const hasDirty = Object.values(dirty).some(Boolean);

  // تجميع حسب القسم
  const groups = useMemo(() => {
    const filtered = list.filter((b) => q === "" || b.key.toLowerCase().includes(q.toLowerCase()) || b.value.ar.includes(q) || b.value.en.toLowerCase().includes(q.toLowerCase()));
    const map: Record<string, Block[]> = {};
    for (const b of filtered) { const { section } = labelFor(b.key); (map[section] ||= []).push(b); }
    return Object.entries(map);
  }, [list, q]);

  return (
    <div className="abh-fade-up">
      <PageHeader title="نصوص الصفحات" subtitle="كل نص في الموقع بنسخته الإنجليزية والعربية — عدّل وانشر فورًا." seed="content-hero"
        action={<Pill icon={Ic.check} onClick={() => hasDirty && !saving && saveAll()}>{saving ? "جارٍ الحفظ…" : "حفظ التعديلات"}</Pill>} />

      {list.length === 0 ? (
        <div style={{ ...card, padding: 44, textAlign: "center" }}>
          <div style={{ display: "grid", placeItems: "center", height: 60, width: 60, margin: "0 auto 18px", borderRadius: 18, border: "1px solid rgba(255,255,255,.1)", color: "var(--abh-platinum)" }}><Ic.type s={26} /></div>
          <h3 className="abh-display" style={{ fontSize: 24, margin: "0 0 10px", color: "var(--abh-ivory)" }}>جدول النصوص فاضي</h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.8, color: "var(--abh-steel)", maxWidth: "46ch", margin: "0 auto" }}>
            الجدول <span className="abh-num" style={{ color: "var(--abh-platinum)" }}>content_blocks</span> مفيهوش صفوف في قاعدتك المحلية لسه. تأكد بـ:
          </p>
          <div className="abh-num" style={{ direction: "ltr", marginTop: 14, display: "inline-block", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.4)", padding: "10px 16px", fontSize: 12.5, color: "var(--abh-ivory)" }}>SELECT count(*) FROM content_blocks;</div>
          <p style={{ fontSize: 12.5, lineHeight: 1.8, color: "var(--abh-steel)", maxWidth: "52ch", margin: "16px auto 0" }}>
            باقي محتوى الموقع (صور الواجهة، الأرقام، العروض، المشاريع، آراء العملاء، الأسئلة) متخزّن في جداول منفصلة — وده هييجي بالتفصيل والصور في الدفعة الجاية.
          </p>
        </div>
      ) : (
        <div className="abh-col" style={{ gap: 22 }}>
          <div style={{ position: "relative", maxWidth: 360 }}>
            <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={15} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في النصوص…" style={{ width: "100%", borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", padding: "11px 16px 11px 40px", fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
          </div>
          {groups.map(([section, blocks]) => (
            <div key={section} style={{ ...card, padding: 26 }}>
              <SubHead action={<Chip tone="platinum">{blocks.length}</Chip>}>{section}</SubHead>
              <div className="abh-col" style={{ gap: 22 }}>
                {blocks.map((b) => (
                  <div key={b.key} style={{ paddingBottom: 22, borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                      <span style={{ fontSize: 12.5, color: "var(--abh-ivory)" }}>{labelFor(b.key).title}</span>
                      <span className="abh-num" style={{ fontSize: 10, color: dirty[b.key] ? "var(--abh-warn)" : "var(--abh-steel)", direction: "ltr" }}>{b.key}{dirty[b.key] ? " ●" : ""}</span>
                    </div>
                    <LocaleField label="" value={b.value} onChange={(v) => update(b.key, v)} multiline={b.value.ar.length > 60 || b.value.en.length > 60} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
