"use client";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ProfileCard from "../../components/profile/ProfileCard";

export default function ProfilePage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#111111]">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />

        <main className="flex-1 overflow-y-auto p-7">
          <ProfileCard />
        </main>
      </div>
    </div>
  );
}