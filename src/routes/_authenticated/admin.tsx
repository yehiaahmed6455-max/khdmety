import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الأدمن — خِدمتي" },
      { name: "description", content: "إحصائيات المنصة وإدارة الحسابات والبلاغات." },
      { property: "og:title", content: "لوحة الأدمن — خِدمتي" },
      { property: "og:description", content: "إحصائيات المنصة وإدارة الحسابات والبلاغات." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (error) return false;
      return !!data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, username, city, page_views, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["admin-reports"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, reported_user_id, reason, reporter_info, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  async function deleteUser(id: string) {
    if (!confirm("حذف بيانات هذا الحساب من المنصة؟")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      toast.error("تعذّر حذف الحساب");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success("تم حذف الحساب");
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) {
      toast.error("تعذّر تحديث البلاغ");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    toast.success("تم تحديث حالة البلاغ");
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <p className="py-20 text-center text-sm font-bold text-muted-foreground">جارٍ التحقق...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="font-display text-2xl font-black">هذه الصفحة للأدمن فقط</p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm font-bold text-brand">
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-3xl font-black">لوحة الأدمن</h1>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="المستخدمون" value={stats?.users_count ?? 0} />
          <Stat label="المشاريع" value={stats?.projects_count ?? 0} />
          <Stat label="إجمالي المشاهدات" value={stats?.total_views ?? 0} />
        </div>

        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-extrabold">المستخدمون</h2>
          <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-ink/10">
            <table className="w-full text-right text-sm">
              <thead className="text-xs text-ink/50">
                <tr>
                  <th className="p-3">الاسم</th>
                  <th className="p-3">الرابط</th>
                  <th className="p-3">المدينة</th>
                  <th className="p-3">المشاهدات</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-ink/5">
                    <td className="p-3 font-bold">{u.name || "—"}</td>
                    <td className="p-3 text-ink/60" dir="ltr">
                      {u.username ? `/${u.username}` : "—"}
                    </td>
                    <td className="p-3 text-ink/60">{u.city || "—"}</td>
                    <td className="p-3">{u.page_views}</td>
                    <td className="p-3">
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="rounded-lg bg-clay/10 px-3 py-1.5 text-xs font-bold text-clay"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
                {(users ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      لا يوجد مستخدمون بعد
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-extrabold">البلاغات</h2>
          <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-ink/10">
            <table className="w-full text-right text-sm">
              <thead className="text-xs text-ink/50">
                <tr>
                  <th className="p-3">السبب</th>
                  <th className="p-3">المُبلِغ</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {(reports ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-ink/5">
                    <td className="max-w-xs p-3">{r.reason}</td>
                    <td className="p-3 text-ink/60">{r.reporter_info || "—"}</td>
                    <td className="p-3 font-bold">
                      {r.status === "pending" ? "قيد المراجعة" : "تمت المراجعة"}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() =>
                          setStatus(r.id, r.status === "pending" ? "reviewed" : "pending")
                        }
                        className="rounded-lg bg-paper px-3 py-1.5 text-xs font-bold ring-1 ring-ink/10"
                      >
                        تغيير الحالة
                      </button>
                    </td>
                  </tr>
                ))}
                {(reports ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      لا توجد بلاغات
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-ink/10">
      <p className="text-xs font-bold text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-black">{value}</p>
    </div>
  );
}
