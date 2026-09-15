import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — خِدمتي" },
      { name: "description", content: "سجّل دخولك إلى حسابك على منصة خِدمتي." },
      { property: "og:title", content: "تسجيل الدخول — خِدمتي" },
      { property: "og:description", content: "سجّل دخولك إلى حسابك على منصة خِدمتي." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("البريد الإلكتروني غير صحيح");
      return;
    }
    if (!password) {
      toast.error("اكتب كلمة المرور");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login")) toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      else if (msg.includes("email not confirmed"))
        toast.error("لم يتم تأكيد البريد بعد، افتح رسالة التأكيد في بريدك");
      else toast.error("تعذّر تسجيل الدخول، حاول مرة أخرى");
      return;
    }
    toast.success("أهلًا بعودتك 👋");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-black">تسجيل الدخول</h1>
        <p className="mt-2 text-sm text-muted-foreground">ادخل لحسابك لإدارة صفحتك وأعمالك.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-2xl bg-card p-4 ring-1 ring-ink/10">
          <div>
            <label className="mb-1 block text-sm font-bold">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-paper px-3.5 py-3 text-sm outline-none ring-1 ring-ink/10 focus:ring-brand"
              placeholder="name@example.com"
              maxLength={255}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-paper px-3.5 py-3 text-sm outline-none ring-1 ring-ink/10 focus:ring-brand"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm font-bold">
          ليس لديك حساب؟{" "}
          <Link to="/signup" className="text-brand">
            أنشئ صفحتك مجانًا
          </Link>
        </p>
      </main>
    </div>
  );
}
