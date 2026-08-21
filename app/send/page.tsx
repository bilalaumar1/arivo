import Sidebar from "@/components/layout/Sidebar";
import SendPage from "@/components/send/SendPage";

export default function Page() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#111111]">

      {/* Sidebar */}

      <Sidebar />

      {/* Send Page */}

      <main className="min-w-0 flex-1 overflow-y-auto">
        <SendPage />
      </main>

    </div>
  );
}