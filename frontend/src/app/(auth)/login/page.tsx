"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { auth } from "@/lib/api";
import { ApiError } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setIsSubmitting(true);
    setError(null);
    try {
      await auth.login(data);
      router.push(redirectTo);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Invalid email or password.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#6C63FF]/20">
          <Zap className="h-6 w-6 text-[#6C63FF]" />
        </div>
        <h1 className="text-2xl font-bold text-[#F0F0FF]">Welcome back</h1>
        <p className="mt-2 text-sm text-[#8888AA]">
          Sign in to your JobCatcher account
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-[#FF6B6B]/20 bg-[#FF6B6B]/10 px-4 py-3 text-sm text-[#FF6B6B]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-[#8888AA]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-3 text-sm text-[#F0F0FF] placeholder-[#55557A] outline-none transition-colors focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF]"
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-[#FF6B6B]">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-[#8888AA]"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-3 pr-11 text-sm text-[#F0F0FF] placeholder-[#55557A] outline-none transition-colors focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF]"
              {...register("password")}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#55557A] hover:text-[#8888AA]"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-[#FF6B6B]">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-[#8888AA]">
            <input
              type="checkbox"
              className="rounded border-[#2E2E4A] bg-[#1A1A2E] text-[#6C63FF] focus:ring-[#6C63FF]"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-[#6C63FF] hover:text-[#6C63FF]/80"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5A52E0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#2E2E4A]" />
        <span className="text-xs text-[#55557A]">or continue with</span>
        <div className="h-px flex-1 bg-[#2E2E4A]" />
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-3 text-sm font-medium text-[#F0F0FF] transition-colors hover:bg-[#252540]"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.01-.54z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </button>

      <p className="mt-6 text-center text-sm text-[#8888AA]">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-[#6C63FF] hover:text-[#6C63FF]/80"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
