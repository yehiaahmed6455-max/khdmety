import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "أنشئ صفحتك مجانًا — خِدمتي" },
      { name: "description", content: "سجّل حسابًا مجانيًا على خِدمتي واعرض مهاراتك وأعمالك." },
      { property: "og:title", content: "أنشئ صفحتك مجانًا — خِدمتي" },
      { property: "og:description", content: "سجّل حسابًا مجانيًا واعرض مهاراتك وأعمالك." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("اكتب اسمك بالكامل");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("البريد الإلكتروني غير صحيح");
      return;
    }
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name: name.trim() },
      },
    });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been registered"))
        toast.error("هذا البريد مسجّل بالفعل، جرّب تسجيل الدخول");
      else if (msg.includes("password")) toast.error("كلمة المرور ضعيفة، استخدم 6 أحرف على الأقل");
      else toast.error("تعذّر إنشاء الحساب، حاول مرة أخرى");
      return;
    }

    if (data.session) {
      toast.success("تم إنشاء حسابك 🎉");
      navigate({ to: "/dashboard/edit-profile" });
    } else {
      setSent(true);
      toast.success("أرسلنا لك رسالة تأكيد على بريدك");
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-black">أنشئ صفحتك مجانًا</h1>
        <p className="mt-2 text-sm text-muted-foreground">دقيقة واحدة ويكون عندك رابط مهني خاص بك.</p>

        {sent ? (
          <div className="mt-6 rounded-2xl bg-card p-5 text-center ring-1 ring-ink/10">
            <p className="font-display text-lg font-extrabold">تحقق من بريدك 📩</p>
            <p className="mt-2 text-sm text-muted-foreground">
              أرسلنا رابط تأكيد إلى {email}. بعد التأكيد سجّل الدخول لتكمل ملفك.
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm font-bold text-brand">
              الذهاب لتسجيل الدخول
            </Link>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-6 space-y-3 rounded-2xl bg-card p-4 ring-1 ring-ink/10"
          >
            <div>
              <label className="mb-1 block text-sm font-bold">الاسم</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="w-full rounded-xl bg-paper px-3.5 py-3 text-sm outline-none ring-1 ring-ink/10 focus:ring-brand"
                placeholder="مثال: أحمد سمير"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                className="w-full rounded-xl bg-paper px-3.5 py-3 text-sm outline-none ring-1 ring-ink/10 focus:ring-brand"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-paper px-3.5 py-3 text-sm outline-none ring-1 ring-ink/10 focus:ring-brand"
                placeholder="6 أحرف على الأقل"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm font-bold">
          لديك حساب؟{" "}
          <Link to="/login" className="text-brand">
            تسجيل الدخول
          </Link>
        </p>
      </main>
    </div>
  );
}
