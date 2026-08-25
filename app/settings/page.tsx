import Sidebar from "@/components/layout/Sidebar";
import SettingsPage from "@/components/settings/SettingsPage";

export default function Page() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#111111]">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <SettingsPage />
      </main>
    </div>
  );
}