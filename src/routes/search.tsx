import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { CATEGORIES, EGYPT_CITIES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

type SearchParams = {
  q?: string | undefined;
  city?: string | undefined;
  category?: string | undefined;
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search['q'] === "string" && search['q'] ? search['q'] : undefined,
    city: typeof search['city'] === "string" && search['city'] ? search['city'] : undefined,
    category:
      typeof search['category'] === "string" && search['category'] ? search['category'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ابحث عن مقدّم خدمة — خِدمتي" },
      { name: "description", content: "فلتر حسب التصنيف والمدينة وابحث عن أصحاب المهارات في مصر." },
      { property: "og:title", content: "ابحث عن مقدّم خدمة — خِدمتي" },
      { property: "og:description", content: "فلتر حسب التصنيف والمدينة وابحث عن أصحاب المهارات." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, city, category } = Route.useSearch();
  const navigate = useNavigate();

  function setParam(patch: SearchParams) {
    navigate({ to: "/search", search: (prev) => ({ ...prev, ...patch }) });
  }

  const { data, isLoading } = useQuery({
    queryKey: ["search", q, city, category],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, name, title, city, username, profile_image_url, skills, category")
        .not("username", "is", null);

      if (category) query = query.eq("category", category);
      if (city) query = query.eq("city", city);
      if (q) query = query.or(`name.ilike.%${q}%,title.ilike.%${q}%`);

      const { data, error } = await query.order("page_views", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-black">البحث عن مقدّمي الخدمات</h1>

        <section className="mt-5 rounded-2xl bg-card p-3 ring-1 ring-ink/10">
          <div className="flex items-center gap-2 rounded-xl bg-paper px-3.5 py-3">
            <span className="text-lg leading-none text-ink/40">⌕</span>
            <input
              defaultValue={q ?? ""}
              onChange={(e) => setParam({ q: e.target.value || undefined })}
              placeholder="ابحث بالاسم أو المسمى المهني..."
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-ink/35"
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={category ?? ""}
              onChange={(e) => setParam({ category: e.target.value || undefined })}
              className="rounded-xl bg-paper px-3.5 py-3 text-sm font-bold text-ink/70 outline-none"
            >
              <option value="">كل التصنيفات</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={city ?? ""}
              onChange={(e) => setParam({ city: e.target.value || undefined })}
              className="rounded-xl bg-paper px-3.5 py-3 text-sm font-bold text-ink/70 outline-none"
            >
              <option value="">كل المدن</option>
              {EGYPT_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-6">
          {isLoading ? (
            <p className="py-10 text-center text-sm font-bold text-muted-foreground">
              جارٍ التحميل...
            </p>
          ) : !data || data.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center ring-1 ring-ink/10">
              <p className="font-display text-lg font-extrabold">لا توجد نتائج</p>
              <p className="mt-2 text-sm text-muted-foreground">
                جرّب تغيير التصنيف أو المدينة، أو ابحث بكلمة أخرى.
              </p>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {data.map((p) => (
                <Link
                  key={p.id}
                  to="/$username"
                  params={{ username: p.username! }}
                  className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-ink/10"
                >
                  {p.profile_image_url ? (
                    <img
                      src={p.profile_image_url}
                      alt={p.name}
                      className="size-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand/10 font-display text-lg font-black text-brand">
                      {p.name?.charAt(0) || "؟"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold">{p.name || "بدون اسم"}</p>
                    <p className="truncate text-xs font-bold text-ink/55">
                      {p.title || "مقدّم خدمة"} {p.city ? `· ${p.city}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(p.skills ?? []).slice(0, 2).map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold ring-1 ring-ink/10"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="font-bold text-brand">›</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
