import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export function SiteHeader() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Link to="/" className="font-display text-2xl font-black tracking-tight">
          خِدمتي
        </Link>
        <nav className="flex items-center gap-4 text-sm font-bold">
          <Link to="/search" className="text-ink/70 hover:text-ink">
            البحث
          </Link>
          {loading ? null : user ? (
            <>
              <Link to="/dashboard" className="text-ink/70 hover:text-ink">
                لوحتي
              </Link>
              <button
                onClick={signOut}
                className="rounded-md bg-ink px-3.5 py-2 font-bold text-paper"
              >
                خروج
              </button>
            </>
          ) : (
            <Link to="/login" className="rounded-md bg-ink px-3.5 py-2 font-bold text-paper">
              دخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
