import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel } from "@/lib/constants";

export const Route = createFileRoute("/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — خِدمتي` },
      { name: "description", content: `الصفحة المهنية لـ ${params.username} على منصة خِدمتي.` },
      { property: "og:title", content: `${params.username} — خِدمتي` },
      { property: "og:description", content: `تعرّف على أعمال ${params.username} وتواصل معه مباشرة.` },
    ],
  }),
  component: PublicProfile,
});

type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tools_used: string[] | null;
  images: string[] | null;
  external_link: string | null;
};

function PublicProfile() {
  const { username } = Route.useParams();
  const [openProject, setOpenProject] = useState<ProjectRow | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reporter, setReporter] = useState("");
  const [sending, setSending] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["public-projects", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, description, category, tools_used, images, external_link")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectRow[];
    },
  });

  useEffect(() => {
    if (!profile?.id) return;
    void supabase.rpc("increment_page_views", { _username: username });
  }, [profile?.id, username]);

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) {
      toast.error("اكتب سبب الإبلاغ بوضوح");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("reports").insert({
      reported_user_id: profile!.id,
      reason: reason.trim().slice(0, 1000),
      reporter_info: reporter.trim().slice(0, 255) || null,
    });
    setSending(false);
    if (error) {
      toast.error("تعذّر إرسال البلاغ");
      return;
    }
    toast.success("تم استلام البلاغ، شكرًا لك");
    setReportOpen(false);
    setReason("");
    setReporter("");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <p className="py-20 text-center text-sm font-bold text-muted-foreground">جارٍ التحميل...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="font-display text-2xl font-black">الصفحة غير موجودة</p>
          <p className="mt-2 text-sm text-muted-foreground">
            لا يوجد مقدّم خدمة بهذا الاسم: {username}
          </p>
          <Link to="/search" search={{}} className="mt-4 inline-block text-sm font-bold text-brand">
            تصفّح مقدّمي الخدمات
          </Link>
        </div>
      </div>
    );
  }

  const waNumber = (profile.whatsapp ?? "").replace(/[^\d]/g, "");
  const rawLinks = (profile as { links?: unknown }).links;
  const extraLinks = Array.isArray(rawLinks)
    ? (rawLinks as { label?: string; url?: string }[])
        .filter((l) => l && typeof l.url === "string" && /^https?:\/\//i.test(l.url))
        .map((l) => ({ label: String(l.label ?? "رابط"), url: String(l.url) }))
    : [];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <section className="mt-6 rounded-2xl bg-card p-5 ring-1 ring-ink/10">
          <div className="flex items-start gap-4">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={profile.name}
                className="size-20 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-brand/10 font-display text-2xl font-black text-brand">
                {profile.name?.charAt(0) || "؟"}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-black">{profile.name || "بدون اسم"}</h1>
              <p className="mt-0.5 text-sm font-bold text-ink/60">
                {profile.title || "مقدّم خدمة"}
              </p>
              <p className="mt-1 text-xs font-bold text-ink/45">
                {profile.city ? `📍 ${profile.city}` : ""}
                {profile.years_of_experience
                  ? ` · ${profile.years_of_experience} سنوات خبرة`
                  : ""}
                {profile.category ? ` · ${categoryLabel(profile.category)}` : ""}
              </p>
            </div>
          </div>

          {profile.bio ? (
            <p className="mt-4 text-sm leading-relaxed text-ink/75">{profile.bio}</p>
          ) : null}

          {(profile.skills ?? []).length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(profile.skills ?? []).map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold ring-1 ring-ink/10"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {waNumber ? (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                تواصل الآن عبر واتساب
              </a>
            ) : null}
            {profile.contact_email ? (
              <a
                href={`mailto:${profile.contact_email}`}
                className="rounded-xl bg-paper px-4 py-3 text-sm font-bold ring-1 ring-ink/10"
              >
                إيميل
              </a>
            ) : null}
            {profile.facebook ? (
              <a
                href={profile.facebook}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-paper px-4 py-3 text-sm font-bold ring-1 ring-ink/10"
              >
                فيسبوك
              </a>
            ) : null}
            {profile.instagram ? (
              <a
                href={profile.instagram}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-paper px-4 py-3 text-sm font-bold ring-1 ring-ink/10"
              >
                إنستجرام
              </a>
            ) : null}
            {extraLinks.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-xl bg-paper px-4 py-3 text-sm font-bold ring-1 ring-ink/10"
              >
                {l.label}
              </a>
            ))}
          </div>
        </section>


        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-extrabold">معرض الأعمال</h2>
          {!projects || projects.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center ring-1 ring-ink/10">
              <p className="text-sm font-bold text-muted-foreground">لم يُضف أي عمل بعد.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setOpenProject(p)}
                  className="overflow-hidden rounded-2xl bg-card text-right ring-1 ring-ink/10"
                >
                  {p.images && p.images[0] ? (
                    <img src={p.images[0]} alt={p.title} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="grid h-40 w-full place-items-center bg-paper text-3xl">🗂️</div>
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-extrabold">{p.title}</p>
                    <p className="truncate text-xs font-bold text-ink/50">
                      {p.category ? categoryLabel(p.category) : "مشروع"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="mt-10 text-center">
          <button
            onClick={() => setReportOpen((v) => !v)}
            className="text-xs font-bold text-ink/40 underline"
          >
            الإبلاغ عن هذا الحساب
          </button>
        </div>

        {reportOpen ? (
          <form
            onSubmit={submitReport}
            className="mx-auto mt-4 max-w-md space-y-2 rounded-2xl bg-card p-4 ring-1 ring-ink/10"
          >
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="سبب الإبلاغ..."
              className="w-full rounded-xl bg-paper px-3.5 py-3 text-sm outline-none ring-1 ring-ink/10 focus:ring-brand"
            />
            <input
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              maxLength={255}
              placeholder="بيانات التواصل معك (اختياري)"
              className="w-full rounded-xl bg-paper px-3.5 py-3 text-sm outline-none ring-1 ring-ink/10 focus:ring-brand"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-ink py-3 text-sm font-bold text-paper disabled:opacity-60"
            >
              {sending ? "جارٍ الإرسال..." : "إرسال البلاغ"}
            </button>
          </form>
        ) : null}
      </main>

      {openProject ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
          onClick={() => setOpenProject(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-4 sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl font-black">{openProject.title}</h3>
              <button onClick={() => setOpenProject(null)} className="text-lg font-bold text-ink/40">
                ✕
              </button>
            </div>
            {openProject.description ? (
              <p className="mt-2 text-sm leading-relaxed text-ink/75">{openProject.description}</p>
            ) : null}
            {(openProject.tools_used ?? []).length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(openProject.tools_used ?? []).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold ring-1 ring-ink/10"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
              {(openProject.images ?? []).map((img) => (
                <img key={img} src={img} alt={openProject.title} className="w-full rounded-xl" />
              ))}
            </div>
            {openProject.external_link ? (
              <a
                href={openProject.external_link}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block rounded-xl bg-brand py-3 text-center text-sm font-bold text-primary-foreground"
              >
                فتح الرابط الخارجي
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
