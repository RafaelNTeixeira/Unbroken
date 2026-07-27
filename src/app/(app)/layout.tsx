import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 pb-20 pt-6 md:px-8 md:pb-10">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  );
}
