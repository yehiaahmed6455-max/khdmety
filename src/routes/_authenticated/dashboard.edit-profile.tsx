import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { CATEGORIES, EGYPT_CITIES, SKILLS_BY_CATEGORY } from "@/lib/constants";
import { uploadImage } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/dashboard/edit-profile")({
  head: () => ({
    meta: [
      { title: "تعديل الملف الشخصي — خِدمتي" },
      { name: "description", content: "حدّث بياناتك المهنية ومهاراتك وروابط التواصل." },
      { property: "og:title", content: "تعديل الملف الشخصي — خِدمتي" },
      { property: "og:description", content: "حدّث بياناتك المهنية ومهاراتك وروابط التواصل." },
    ],
  }),
  component: EditProfile,
});

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function EditProfile() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [years, setYears] = useState<string | number>("");
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [username, setUsername] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "ok" | "taken" | "bad">(
    "idle",
  );

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setTitle(profile.title ?? "");
    setCity(profile.city ?? "");
    setBio(profile.bio ?? "");
    setYears(profile.years_of_experience ? profile.years_of_experience : "");
    setCategory(profile.category ?? "");
    setSkills(profile.skills ?? []);
    setUsername(profile.username ?? "");
    setWhatsapp(profile.whatsapp ?? "");
    setFacebook(profile.facebook ?? "");
    setInstagram(profile.instagram ?? "");
    setContactEmail(profile.contact_email ?? "");
    const raw = (profile as { links?: unknown }).links;
    setLinks(
      Array.isArray(raw)
        ? (raw as { label?: string; url?: string }[])
            .filter((l) => l && typeof l.url === "string")
            .map((l) => ({ label: String(l.label ?? ""), url: String(l.url) }))
        : [],
    );
    setImageUrl(profile.profile_image_url ?? null);
  }, [profile]);

  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (!value) {
      setUsernameState("idle");
      return;
    }
    if (!USERNAME_RE.test(value)) {
      setUsernameState("bad");
      return;
    }
    if (profile?.username === value) {
      setUsernameState("ok");
      return;
    }
    setUsernameState("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", value)
        .maybeSingle();
      setUsernameState(data ? "taken" : "ok");
    }, 400);
    return () => clearTimeout(t);
  }, [username, profile?.username]);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadImage("avatars", user.id, file);
      setImageUrl(url);
      toast.success("تم رفع الصورة");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function addSkill(s: string) {
    const v = s.trim();
    if (!v || skills.includes(v) || skills.length >= 12) return;
    setSkills([...skills, v]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (name.trim().length < 2) {
      toast.error("اكتب اسمك");
      return;
    }
    if (usernameState === "bad") {
      toast.error("اسم المستخدم: حروف إنجليزية صغيرة وأرقام و _ فقط (3-20 حرفًا)");
      return;
    }
    if (usernameState === "taken") {
      toast.error("اسم المستخدم مستخدم بالفعل");
      return;
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      toast.error("البريد الإلكتروني غير صحيح");
      return;
    }

    const cleanLinks = links
      .map((l) => ({ label: l.label.trim().slice(0, 40), url: l.url.trim().slice(0, 300) }))
      .filter((l) => l.url.length > 0)
      .map((l) => ({
        label: l.label || "رابط",
        url: /^https?:\/\//i.test(l.url) ? l.url : `https://${l.url}`,
      }))
      .slice(0, 8);

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim().slice(0, 80),
        title: title.trim().slice(0, 80),
        city,
        bio: bio.trim().slice(0, 1000),
        years_of_experience: Math.max(0, Math.min(60, Number(years) || 0)),
        category: category || null,
        skills,
        username: username.trim().toLowerCase() || null,
        whatsapp: whatsapp.replace(/[^\d+]/g, "") || null,
        facebook: facebook.trim() || null,
        instagram: instagram.trim() || null,
        contact_email: contactEmail.trim() || null,
        profile_image_url: imageUrl,
        links: cleanLinks,
      })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast.error(
        error.message.includes("duplicate") ? "اسم المستخدم مستخدم بالفعل" : "تعذّر حفظ البيانات",
      );
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    toast.success("تم حفظ ملفك الشخصي ✅");
    navigate({ to: "/dashboard" });
  }

  const suggested = SKILLS_BY_CATEGORY[category] ?? [];
  const fieldClass =
    "w-full rounded-xl bg-paper px-3.5 py-3 text-sm outline-none ring-1 ring-ink/10 focus:ring-brand";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-black">تعديل الملف الشخصي</h1>

        <form onSubmit={save} className="mt-6 space-y-4">
          <section className="rounded-2xl bg-card p-4 ring-1 ring-ink/10">
            <p className="mb-3 font-display font-extrabold">الصورة الشخصية</p>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <img src={imageUrl} alt="صورتك" className="size-20 rounded-2xl object-cover" />
              ) : (
                <div className="grid size-20 place-items-center rounded-2xl bg-brand/10 text-2xl">
                  👤
                </div>
              )}
              <label className="cursor-pointer rounded-xl bg-paper px-4 py-2.5 text-sm font-bold ring-1 ring-ink/10">
                {uploading ? "جارٍ الرفع..." : "اختر صورة"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={onPickImage}
                />
              </label>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-ink/10">
            <p className="font-display font-extrabold">البيانات الأساسية</p>
            <div>
              <label className="mb-1 block text-sm font-bold">الاسم</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">المسمى المهني</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: مصمم جرافيك"
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-bold">المدينة</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">اختر المحافظة</option>
                  {EGYPT_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">سنوات الخبرة</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">نبذة عنك</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1000}
                className={fieldClass}
              />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-ink/10">
            <p className="font-display font-extrabold">التصنيف والمهارات</p>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={fieldClass}
            >
              <option value="">اختر التصنيف الرئيسي</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>

            {suggested.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {suggested.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => addSkill(s)}
                    className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold ring-1 ring-ink/10"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex gap-2">
              <input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill(newSkill);
                    setNewSkill("");
                  }
                }}
                placeholder="أضف مهارة..."
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => {
                  addSkill(newSkill);
                  setNewSkill("");
                }}
                className="rounded-xl bg-ink px-4 text-sm font-bold text-paper"
              >
                إضافة
              </button>
            </div>

            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSkills(skills.filter((x) => x !== s))}
                    className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand"
                  >
                    {s} ✕
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">لم تضف مهارات بعد.</p>
            )}
          </section>

          <section className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-ink/10">
            <p className="font-display font-extrabold">رابط صفحتك</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink/45" dir="ltr">
                /
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                dir="ltr"
                placeholder="ahmed_designer"
                className={fieldClass}
              />
            </div>
            {usernameState === "checking" ? (
              <p className="text-xs font-bold text-ink/50">جارٍ التحقق...</p>
            ) : usernameState === "ok" ? (
              <p className="text-xs font-bold text-brand">اسم المستخدم متاح ✔</p>
            ) : usernameState === "taken" ? (
              <p className="text-xs font-bold text-clay">مستخدم بالفعل، جرّب اسمًا آخر</p>
            ) : usernameState === "bad" ? (
              <p className="text-xs font-bold text-clay">
                حروف إنجليزية صغيرة وأرقام و _ فقط (3-20 حرفًا)
              </p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-ink/10">
            <p className="font-display font-extrabold">روابط التواصل</p>
            <div>
              <label className="mb-1 block text-sm font-bold">رقم واتساب (بمفتاح الدولة)</label>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                dir="ltr"
                placeholder="201001234567"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">فيسبوك</label>
              <input
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                dir="ltr"
                placeholder="https://facebook.com/..."
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">إنستجرام</label>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                dir="ltr"
                placeholder="https://instagram.com/..."
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">البريد الإلكتروني</label>
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                dir="ltr"
                className={fieldClass}
              />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-ink/10">
            <p className="font-display font-extrabold">روابط إضافية</p>
            <p className="text-xs text-muted-foreground">
              أضف رابط بورتفوليو أو موقعك أو أي حساب آخر (حتى 8 روابط).
            </p>

            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={l.label}
                  onChange={(e) =>
                    setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="اسم الرابط (بورتفوليو)"
                  maxLength={40}
                  className={`${fieldClass} basis-1/3`}
                />
                <input
                  value={l.url}
                  onChange={(e) =>
                    setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                  }
                  dir="ltr"
                  placeholder="https://..."
                  maxLength={300}
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={() => setLinks(links.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-xl bg-paper px-3 text-sm font-bold text-clay ring-1 ring-ink/10"
                >
                  حذف
                </button>
              </div>
            ))}

            <button
              type="button"
              disabled={links.length >= 8}
              onClick={() => setLinks([...links, { label: "", url: "" }])}
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-paper disabled:opacity-50"
            >
              + إضافة رابط
            </button>
          </section>


          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </form>
      </main>
    </div>
  );
}
