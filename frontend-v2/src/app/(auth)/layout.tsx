import { AuthShowcase } from "@/components/auth/auth-showcase";
import { AuthThemeToggle } from "@/components/auth/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <AuthThemeToggle />

      <div className="hidden w-1/2 p-3 lg:block">
        <AuthShowcase />
      </div>

      <div className="flex w-full items-center justify-center p-4 sm:p-6 lg:w-1/2">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
