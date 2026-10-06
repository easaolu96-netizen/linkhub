import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-5 sm:px-8">
        <Logo />
      </header>
      <main id="main" tabIndex={-1} className="flex flex-1 justify-center px-5 pt-6 pb-20 sm:pt-14">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
