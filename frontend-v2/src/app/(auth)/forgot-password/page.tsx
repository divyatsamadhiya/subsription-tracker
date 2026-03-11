"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "request" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        let message = "Failed to send reset code";
        try {
          const data = await res.json();
          if (data.error) message = data.error;
        } catch { /* non-JSON response */ }
        throw new Error(message);
      }

      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("Password must contain uppercase, lowercase, and a digit");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      if (!res.ok) {
        let message = "Failed to reset password";
        try {
          const data = await res.json();
          if (data.error) message = data.error;
        } catch { /* non-JSON response */ }
        throw new Error(message);
      }

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to login
      </Link>

      <AnimatePresence mode="wait">
        {step === "request" && (
          <motion.div
            key="request"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Forgot your password?
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a reset code
            </p>

            <form onSubmit={handleRequestCode} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>

              <Button type="submit" size="lg" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Send reset code"
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "reset" && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Reset your password
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter the code we sent to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>

            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="token">Reset code</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Enter 8-character code"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  autoComplete="one-time-code"
                  className="h-11 font-mono tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Min 8 chars, upper + lower + digit"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Must include uppercase, lowercase, and a number
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Reset password"
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10"
            >
              <CheckCircle2 className="size-7 text-success" />
            </motion.div>

            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Password reset!
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your password has been updated successfully
            </p>

            <Button
              size="lg"
              className="mt-6 w-full h-11"
              render={<Link href="/login" />}
            >
              Back to sign in
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
