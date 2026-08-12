"use client";
/**
 * app/admin/bookings/[id]/receive-client.tsx — شاشة الاستلام (عرض كامل، عمودان).
 * يمين: بيانات (قابلة للتعديل) + خدمات (قابلة للتعديل قبل الدفع) + دفع.
 * يسار: صور فحص + ملاحظات (إجباري) + توقيع (إجباري).
 */
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { card, Pill, Ghost, Ic, EGP, Textarea, useToast, Modal } from "@/components/admin/ui";
import { brandImg } from "@/lib/brand-image";
import SignaturePad from "@/components/admin/signature-pad";
import InspectionPhotos, { type InspPhoto } from "@/components/admin/inspection-photos";
import ImageUpload from "@/components/admin/image-upload";

type CatalogItem = { id: number; slug: string; name: string; category: string; onRequest: boolean; active: boolean; price: number };

export default function ReceiveClient({ booking, locale, payMethods, catalog }: {
  booking: any; locale: string; payMethods: { code: string; label: string }[]; catalog: CatalogItem[];
}) {
  const isAr = locale !== "en";
  const ccy = isAr ? "ريال" : "SAR";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const router = useRouter();

  const alreadyReceived = !!booking.receivedAt;
  const isPaid = booking.payment === "paid";

  const [customer, setCustomer] = useState(booking.customer === "—" ? "" : booking.customer);
  const [phone, setPhone] = useState(booking.phone || "");
  const [vehicle, setVehicle] = useState(booking.vehicle === "—" ? "" : booking.vehicle);
  const [plate, setPlate] = useState(booking.plate || "");
  // (جديد) قراءة العداد وقت الاستلام — تُستخدم كمرجع لاحقًا لفحص الضمان بالكيلومترات.
  const [odometerKm, setOdometerKm] = useState(booking.odometerKm != null ? String(booking.odometerKm) : "");

  const [services, setServices] = useState<any[]>(booking.services || []);
  const [serviceSlugs, setServiceSlugs] = useState<string[]>(booking.serviceSlugs || []);
  const [editSvc, setEditSvc] = useState(false);

  const [photos, setPhotos] = useState<InspPhoto[]>(booking.existingPhotos || []);
  const [notes, setNotes] = useState(booking.supervisorNotes || "");
  const [signature, setSignature] = useState(booking.existingSignature || "");
  const [payMethod, setPayMethod] = useState(booking.paymentMethod || "");
  const [payProof, setPayProof] = useState(booking.paymentProofUrl || "");
  const [busy, setBusy] = useState(false);

  const step = { notes: !!notes.trim(), sig: !!signature };
  const servicesTotal = services.reduce((s: number, x: any) => s + (Number(x.price) || 0), 0);

  async function saveServices(newSlugs: string[]) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/services`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: newSlugs }),
      });
      const data = await res.json();
      if (!data.ok) {
        const msg: Record<string, string> = {
          already_paid: T("الحجز مدفوع — لا يمكن التعديل", "Paid — can't edit"),
          booking_cancelled: T("الحجز ملغي", "Booking cancelled"),
        };
        throw new Error(msg[data.error] || T("فشل تعديل الخدمات", "Failed to edit services"));
      }
      // نحدّث العرض من رد السيرفر
      setServices((data.services || []).map((r: any) => ({
        name: r.name_snapshot ? (isAr ? (r.name_snapshot.ar ?? r.slug) : (r.name_snapshot.en ?? r.slug)) : r.slug,
        price: Number(r.price) || 0, slug: r.slug,
      })).filter((s: any) => s.name && s.slug !== "custom" ? true : s.name));
      setServiceSlugs(newSlugs);
      toast(T("تم تحديث الخدمات", "Services updated"));
      setEditSvc(false);
      router.refresh();
    } catch (e: any) {
      toast(e.message || T("فشل", "Failed"), "bad");
    } finally { setBusy(false); }
  }

  async function submit() {
    if (!notes.trim()) { toast(T("ملاحظات المشرف إجبارية", "Notes required"), "bad"); return; }
    if (!signature) { toast(T("توقيع العميل إجباري", "Signature required"), "bad"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/receive`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisorNotes: notes.trim(), signatureUrl: signature, signerName: customer || booking.customer,
          paymentMethod: payMethod || null, paymentProofUrl: payProof || null,
          customerName: customer || null, customerPhone: phone || null,
          vehicleLabel: vehicle || null, plate: plate || null,
          odometerKm: odometerKm.trim() ? Number(odometerKm) : null,
          photos: photos.map((p) => ({ url: p.url, comment: p.comment })),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        const msg: Record<string, string> = {
          notes_required: T("ملاحظات المشرف إجبارية", "Notes required"),
          signature_required: T("توقيع العميل إجباري", "Signature required"),
          booking_cancelled: T("الحجز ملغي", "Booking cancelled"),
        };
        throw new Error(msg[data.error] || T("فشل الحفظ", "Save failed"));
      }
      toast(T(`تم الاستلام — WO-${data.booking.workOrderNo}`, `Received — WO-${data.booking.workOrderNo}`));
      router.push("/admin/bookings"); router.refresh();
    } catch (e: any) {
      toast(e.message || T("فشل الحفظ", "Save failed"), "bad");
    } finally { setBusy(false); }
  }

  return (
    <div className="abh-fade-up">
      {/* رأس */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.push("/admin/bookings")} style={{ display: "grid", placeItems: "center", height: 40, width: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", color: "var(--abh-platinum)", cursor: "pointer", flexShrink: 0, transform: isAr ? "none" : "scaleX(-1)" }}><Ic.chevDown s={17} extra="abh-flip" /></button>
        <div style={{ flex: 1 }}>
          <h1 className="abh-display" style={{ margin: 0, fontSize: 27, fontWeight: 300, color: "var(--abh-ivory)", textTransform: "uppercase", lineHeight: 1 }}>{T("استلام السيارة", "Vehicle intake")}</h1>
          <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 4 }} dir="ltr">{booking.workOrderNo ? `WO-${booking.workOrderNo} · ` : ""}{booking.reference}</div>
        </div>
        {alreadyReceived && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--abh-ok)", border: "1px solid rgba(159,212,176,.3)", background: "rgba(159,212,176,.06)", borderRadius: 999, padding: "6px 12px", flexShrink: 0 }}>{Ic.check({ s: 13 })}{T("مُستلَمة", "Received")}</span>}
      </div>

      <div className="abh-intake-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18, alignItems: "start" }}>

        {/* ═══════════ العمود الأيمن ═══════════ */}
        <div className="abh-col" style={{ gap: 18 }}>
          <Section n={1} title={T("بيانات السيارة والعميل", "Vehicle & customer")} hint={T("راجع وعدّل أي خطأ — تُحفظ مع الاستلام.", "Review and fix errors — saved with intake.")}>
            <div style={{ position: "relative", height: 90, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${brandImg(booking.brandId, plate || vehicle)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.5)" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(11,12,14,.9),rgba(11,12,14,.25))" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
                <div style={{ display: "flex", gap: "4px 16px", flexWrap: "wrap", fontSize: 11.5, color: "var(--abh-platinum)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.pin s={12} />{booking.branch}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.clock s={12} />{booking.date} · {booking.time}</span>
                </div>
                <span className="abh-num" dir="ltr" style={{ fontSize: 18, color: "#fff" }}>{EGP(booking.total)} {ccy}</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <EditField icon={Ic.users} label={T("العميل", "Customer")} value={customer} onChange={setCustomer} isAr={isAr} placeholder={T("اسم العميل", "Name")} />
              <EditField icon={Ic.bell} label={T("التليفون", "Phone")} value={phone} onChange={setPhone} isAr={isAr} ltr placeholder="+9665…" />
              <EditField icon={Ic.grid} label={T("السيارة", "Vehicle")} value={vehicle} onChange={setVehicle} isAr={isAr} placeholder={T("الموديل", "Model")} />
              <EditField icon={Ic.sliders} label={T("اللوحة", "Plate")} value={plate} onChange={setPlate} isAr={isAr} ltr placeholder={T("اللوحة", "Plate")} />
              <EditField icon={Ic.clock} label={T("قراءة العداد (كم)", "Odometer (km)")} value={odometerKm}
                onChange={(v: string) => setOdometerKm(v.replace(/[^\d]/g, ""))} isAr={isAr} ltr placeholder={T("مثال: 45000", "e.g. 45000")} />
            </div>
            <p style={{ margin: "10px 2px 0", fontSize: 11, color: "var(--abh-steel)", lineHeight: 1.6 }}>
              {T("مرجع مهم لفحص الضمان بالكيلومترات لاحقًا — سجّلها بدقّة كل مرة.", "Important reference for future km-based warranty checks — record it accurately each time.")}
            </p>
          </Section>

          <Section n={2} title={T("الخدمات المطلوبة", "Requested services")}
            hint={isPaid ? T("الحجز مدفوع — لا يمكن تعديل الخدمات.", "Paid — can't edit services.") : T("الخدمات اللي طلبها العميل.", "Services requested.")}
            action={!isPaid && (
              <button type="button" onClick={() => setEditSvc(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "6px 12px", fontSize: 11, cursor: "pointer", border: "1px solid rgba(203,205,205,.3)", background: "rgba(203,205,205,.06)", color: "var(--abh-platinum)" }}>
                {Ic.pencil({ s: 12 })}{T("تعديل", "Edit")}
              </button>
            )}>
            {services.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {services.map((s: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "12px 14px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, color: "var(--abh-ivory)" }}>{Ic.sparkle({ s: 14 })}{s.name}</span>
                    <span dir="ltr" className="abh-num" style={{ fontSize: 14, color: "var(--abh-platinum)" }}>{s.price > 0 ? `${EGP(s.price)} ${ccy}` : T("حسب الطلب", "On request")}</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  <span style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{T("إجمالي الخدمات", "Services total")}</span>
                  <span dir="ltr" className="abh-num" style={{ fontSize: 17, color: "var(--abh-ivory)" }}>{EGP(servicesTotal)} {ccy}</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "var(--abh-steel)" }}>{T("لا خدمات", "No services")}</div>
            )}
          </Section>

          <Section n={3} title={T("الدفع", "Payment")} hint={T("اختياري — اختر الطريقة وارفع إثبات إن وُجد.", "Optional — method and proof if any.")}>
            {/* أزرار الدفع — شبكة تملأ الكونتينر */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
              {payMethods.map((p) => {
                const on = payMethod === p.code;
                return (
                  <button key={p.code} type="button" onClick={() => setPayMethod(on ? "" : p.code)}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, padding: "14px 12px", fontSize: 13.5, cursor: "pointer", border: `1px solid ${on ? "rgba(203,205,205,.55)" : "rgba(255,255,255,.12)"}`, background: on ? "rgba(203,205,205,.12)" : "rgba(255,255,255,.02)", color: on ? "var(--abh-ivory)" : "var(--abh-platinum)", transition: "all .2s" }}>
                    {on && <Ic.check s={14} />}{p.label}
                  </button>
                );
              })}
            </div>
            {payMethod && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 8 }}>{T("إثبات التحويل (اختياري)", "Transfer proof (optional)")}</div>
                <ImageUpload value={payProof} onChange={setPayProof} nameHint="proof" isAr={isAr} folder="payouts-img" />
              </div>
            )}
          </Section>
        </div>

        {/* ═══════════ العمود الأيسر ═══════════ */}
        <div className="abh-col" style={{ gap: 18 }}>
          <Section n={4} title={T("صور فحص السيارة", "Inspection photos")} hint={T("صوّر حالة السيارة — كل صورة لها ملاحظة اختيارية.", "Capture condition — optional comment each.")}>
            <InspectionPhotos value={photos} onChange={setPhotos} isAr={isAr} />
          </Section>

          <Section n={5} title={T("ملاحظات المشرف", "Supervisor notes")} required isAr={isAr} done={step.notes}>
            <Textarea rows={4} value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder={T("حالة السيارة العامة، أي خدوش أو ملاحظات مهمة…", "Overall condition, scratches, important notes…")} style={{ fontSize: 14 }} />
          </Section>

          <Section n={6} title={T("توقيع العميل", "Customer signature")} required isAr={isAr} done={step.sig} hint={T("يوقّع العميل بإصبعه لإقرار حالة السيارة.", "Customer signs to acknowledge condition.")}>
            <SignaturePad value={signature} onChange={setSignature} isAr={isAr} big />
          </Section>
        </div>
      </div>

      {/* شريط الإتمام — يتحرّك مع الصفحة */}
      <div style={{ marginTop: 18, ...card, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: "rgba(16,17,19,.96)", backdropFilter: "blur(16px)", boxShadow: "0 20px 60px -20px rgba(0,0,0,.8)" }}>
        <span style={{ fontSize: 12.5, color: step.notes && step.sig ? "var(--abh-ok)" : "var(--abh-steel)", display: "inline-flex", alignItems: "center", gap: 7 }}>
          {step.notes && step.sig ? <>{Ic.check({ s: 14 })}{T("جاهز للإتمام", "Ready to submit")}</> : (!step.notes ? T("• أضف ملاحظات المشرف", "• Add notes") : T("• التوقيع مطلوب", "• Signature required"))}
        </span>
        <Pill icon={Ic.check} onClick={submit}>{busy ? T("جارٍ الحفظ…", "Saving…") : (alreadyReceived ? T("تحديث الاستلام", "Update") : T("إتمام الاستلام", "Complete intake"))}</Pill>
      </div>

      {/* مودال تعديل الخدمات */}
      {editSvc && (
        <ServiceEditor catalog={catalog} current={serviceSlugs} isAr={isAr} ccy={ccy} busy={busy} T={T}
          onClose={() => setEditSvc(false)} onSave={saveServices} />
      )}

      <style>{`@media(min-width:1000px){.abh-intake-grid{grid-template-columns:1fr 1fr!important}}`}</style>
    </div>
  );
}

/* مودال اختيار الخدمات */
function ServiceEditor({ catalog, current, isAr, ccy, busy, T, onClose, onSave }: any) {
  const [sel, setSel] = useState<string[]>(current);
  const toggle = (slug: string) => setSel((s: string[]) => s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]);
  const total = catalog.filter((c: CatalogItem) => sel.includes(c.slug)).reduce((s: number, c: CatalogItem) => s + (c.onRequest ? 0 : c.price), 0);

  // نجمّع حسب التصنيف
  const groups = catalog.reduce((acc: Record<string, CatalogItem[]>, c: CatalogItem) => {
    (acc[c.category] = acc[c.category] || []).push(c); return acc;
  }, {});

  return (
    <Modal title={T("تعديل الخدمات", "Edit services")} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 18 }}>
        {Object.entries(groups).map(([cat, items]: any) => (
          <div key={cat}>
            <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 10 }}>{cat}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              {items.map((c: CatalogItem) => {
                const on = sel.includes(c.slug);
                return (
                  <button key={c.slug} type="button" onClick={() => toggle(c.slug)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 12, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.08)"}`, background: on ? "rgba(203,205,205,.08)" : "rgba(255,255,255,.02)", padding: "12px 14px", cursor: "pointer", textAlign: "start" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ display: "grid", placeItems: "center", height: 20, width: 20, flexShrink: 0, borderRadius: 6, border: on ? "none" : "1px solid rgba(255,255,255,.2)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", color: "#000" }}>{on && <Ic.check s={12} />}</span>
                      <span style={{ fontSize: 13.5, color: on ? "var(--abh-ivory)" : "var(--abh-platinum)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}{!c.active && <em style={{ fontStyle: "normal", fontSize: 9, color: "var(--abh-steel)", marginInlineStart: 6 }}>· {T("مخفية", "hidden")}</em>}</span>
                    </span>
                    <span dir="ltr" className="abh-num" style={{ fontSize: 13, color: "var(--abh-steel)", flexShrink: 0 }}>{c.onRequest ? T("حسب الطلب", "On req.") : `${EGP(c.price)} ${ccy}`}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: "sticky", bottom: 0, marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(180deg,transparent,rgba(16,17,19,.98) 40%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--abh-platinum)" }}>{sel.length} {T("خدمة", "services")} · <span dir="ltr" className="abh-num" style={{ color: "var(--abh-ivory)" }}>{EGP(total)} {ccy}</span></span>
        <div style={{ display: "flex", gap: 10 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill icon={Ic.check} onClick={() => onSave(sel)}>{busy ? T("جارٍ الحفظ…", "Saving…") : T("حفظ الخدمات", "Save services")}</Pill>
        </div>
      </div>
    </Modal>
  );
}

function Section({ n, title, hint, required, done, isAr, action, children }: any) {
  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <span className="abh-num" style={{ display: "grid", placeItems: "center", height: 28, width: 28, flexShrink: 0, borderRadius: 999, fontSize: 12.5, fontWeight: 700, border: done ? "none" : "1px solid rgba(255,255,255,.15)", background: done ? "linear-gradient(135deg,#9fd4b0,#7fc49a)" : "rgba(255,255,255,.03)", color: done ? "#0b0c0e" : "var(--abh-platinum)" }}>
          {done ? <Ic.check s={14} sw={2.6} /> : n}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15.5, color: "var(--abh-ivory)" }}>{title}</span>
              {required && <span style={{ fontSize: 9, color: "#e7b4b4", border: "1px solid rgba(231,180,180,.4)", borderRadius: 999, padding: "1px 8px" }}>{isAr ? "إجباري" : "Required"}</span>}
            </div>
            {action}
          </div>
          {hint && <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "var(--abh-steel)", lineHeight: 1.5 }}>{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function EditField({ icon: Icon, label, value, onChange, isAr, ltr, placeholder }: any) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${focus ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.1)"}`, background: "rgba(255,255,255,.02)", padding: "10px 12px", transition: "border-color .2s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 5 }}>
        <Icon s={12} />{label}
      </div>
      <input value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholder={placeholder} dir={ltr ? "ltr" : (isAr ? "rtl" : "ltr")}
        style={{ width: "100%", border: "none", background: "transparent", padding: 0, fontSize: 14.5, color: "var(--abh-ivory)", outline: "none", textAlign: ltr ? "left" : (isAr ? "right" : "left") }} />
    </div>
  );
}