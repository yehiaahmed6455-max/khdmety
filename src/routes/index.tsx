import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CATEGORIES, EGYPT_CITIES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "خِدمتي — مهارتك تستحق أن تُرى" },
      {
        name: "description",
        content:
          "ابحث عن مصممين ومبرمجين ومهندسين ومدرسين وفنيين في مصر، أو أنشئ صفحتك المهنية مجانًا.",
      },
      { property: "og:title", content: "خِدمتي — مهارتك تستحق أن تُرى" },
      {
        property: "og:description",
        content: "سوق المهارات المصري: صفحة مهنية مجانية لكل صاحب مهارة.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  const { data: featured } = useQuery({
    queryKey: ["featured-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, title, city, username, profile_image_url, skills")
        .not("username", "is", null)
        .order("page_views", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  function runSearch() {
    navigate({ to: "/search", search: { q: q || undefined, city: city || undefined } });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <section className="pt-10 pb-6">
          <p className="mb-2 font-display text-sm font-extrabold text-clay">سوق المهارات المصري</p>
          <h1 className="font-display text-4xl leading-[1.15] font-black tracking-tight text-balance">
            خِدمتي —<br />
            مهارتك تستحق أن تُرى
          </h1>
          <p className="mt-3 text-muted-foreground text-pretty">
            أنشئ صفحة احترافية تعرض أعمالك، وشاركها مباشرة مع عملائك عبر واتساب.
          </p>
        </section>

        <section className="rounded-2xl bg-card p-3 ring-1 ring-ink/10">
          <div className="flex items-center gap-2 rounded-xl bg-paper px-3.5 py-3">
            <span className="text-lg leading-none text-ink/40">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              type="text"
              placeholder="ابحث عن خدمة أو مهارة..."
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-ink/35"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-paper px-3.5 py-3 text-sm font-bold text-ink/70">
              <span className="text-brand">📍</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex-1 bg-transparent outline-none"
              >
                <option value="">كل المدن</option>
                {EGYPT_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={runSearch}
              className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              بحث
            </button>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-extrabold">التصنيفات</h2>
            <Link to="/search" search={{}} className="text-xs font-bold text-brand">
              عرض الكل
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <Link
                key={c.key}
                to="/search"
                search={{ category: c.key }}
                className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 ring-1 ring-ink/10"
              >
                <span className="text-2xl leading-none">{c.icon}</span>
                <span className="text-xs font-bold">{c.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <Link
            to="/signup"
            className="block rounded-2xl bg-ink p-5 text-center text-paper"
          >
            <span className="font-display text-lg font-black">أنشئ صفحتك مجانًا</span>
            <span className="mt-1 block text-xs text-paper/60">بدون بطاقة · بدون رسوم</span>
          </Link>
        </section>

        {featured && featured.length > 0 ? (
          <section className="mt-10">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest text-ink/40">مواهب على المنصة</span>
              <span className="h-px flex-1 bg-ink/10" />
            </div>
            <div className="space-y-2.5">
              {featured.map((p) => (
                <Link
                  key={p.id}
                  to="/$username"
                  params={{ username: p.username! }}
                  className="flex items-center gap-3 rounded-xl bg-card p-2.5 ring-1 ring-ink/10"
                >
                  {p.profile_image_url ? (
                    <img
                      src={p.profile_image_url}
                      alt={p.name}
                      className="size-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand/10 font-display font-black text-brand">
                      {p.name?.charAt(0) || "؟"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{p.name || "بدون اسم"}</p>
                    <p className="truncate text-xs font-bold text-ink/55">
                      {p.title || "مقدّم خدمة"} {p.city ? `· ${p.city}` : ""}
                    </p>
                  </div>
                  <span className="ms-auto font-bold text-brand">›</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="mt-12 border-t border-ink/10 pt-6 text-center">
          <p className="font-display text-lg font-black">خِدمتي</p>
          <p className="mt-1 text-xs text-muted-foreground">مهارتك تستحق أن تُرى</p>
        </footer>
      </main>
    </div>
  );
}
