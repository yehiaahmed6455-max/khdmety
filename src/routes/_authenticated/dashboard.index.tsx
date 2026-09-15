import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — خِدمتي" },
      { name: "description", content: "أدر صفحتك المهنية وأعمالك على خِدمتي." },
      { property: "og:title", content: "لوحة التحكم — خِدمتي" },
      { property: "og:description", content: "أدر صفحتك المهنية وأعمالك." },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { user } = useSession();

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

  const { data: projectsCount } = useQuery({
    queryKey: ["my-projects-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: isAdmin } = useQuery({
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

  const publicUrl =
    profile?.username && typeof window !== "undefined"
      ? `${window.location.origin}/${profile.username}`
      : "";

  async function copyLink() {
    if (!publicUrl) {
      toast.error("اختر اسم مستخدم أولًا من تعديل الملف الشخصي");
      return;
    }
    await navigator.clipboard.writeText(publicUrl);
    toast.success("تم نسخ رابط صفحتك");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-black">
          مرحبًا، {profile?.name || "بك"} 👋
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          من هنا تدير صفحتك المهنية ومعرض أعمالك.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card p-4 ring-1 ring-ink/10">
            <p className="text-xs font-bold text-ink/50">مشاهدات صفحتك</p>
            <p className="mt-1 font-display text-2xl font-black">{profile?.page_views ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-card p-4 ring-1 ring-ink/10">
            <p className="text-xs font-bold text-ink/50">عدد أعمالك</p>
            <p className="mt-1 font-display text-2xl font-black">{projectsCount ?? 0}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-ink/10">
          <p className="text-xs font-bold text-ink/50">رابط صفحتك العامة</p>
          {profile?.username ? (
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-xl bg-paper px-3 py-2 text-xs" dir="ltr">
                {publicUrl}
              </code>
              <button
                onClick={copyLink}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                نسخ
              </button>
              <Link
                to="/$username"
                params={{ username: profile.username }}
                className="rounded-xl bg-paper px-4 py-2 text-xs font-bold ring-1 ring-ink/10"
              >
                فتح
              </Link>
            </div>
          ) : (
            <p className="mt-2 text-sm font-bold text-clay">
              لم تختر اسم مستخدم بعد — أكمل ملفك الشخصي أولًا.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            to="/dashboard/edit-profile"
            className="rounded-2xl bg-card p-4 ring-1 ring-ink/10"
          >
            <p className="font-display text-lg font-extrabold">تعديل الملف الشخصي</p>
            <p className="mt-1 text-xs text-muted-foreground">الصورة، المدينة، المهارات، التواصل</p>
          </Link>
          <Link to="/dashboard/projects" className="rounded-2xl bg-card p-4 ring-1 ring-ink/10">
            <p className="font-display text-lg font-extrabold">أعمالي</p>
            <p className="mt-1 text-xs text-muted-foreground">أضف أو عدّل أو احذف مشاريعك</p>
          </Link>
        </div>

        <Link
          to="/dashboard/projects"
          className="mt-4 block rounded-2xl bg-ink py-4 text-center font-display text-lg font-black text-paper"
        >
          ➕ إضافة مشروع جديد
        </Link>

        {isAdmin ? (
          <Link to="/admin" className="mt-4 block text-center text-sm font-bold text-brand">
            لوحة تحكم الأدمن
          </Link>
        ) : null}
      </main>
    </div>
  );
}
