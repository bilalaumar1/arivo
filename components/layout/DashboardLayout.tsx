import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import BalanceCard from "../cards/BalanceCard";
import ArcCard from "../cards/ArcCard";
import QuickActions from "../cards/QuickActions";
import Transactions from "../cards/Transactions";
import PortfolioCard from "../cards/PortfolioCard";
import FaucetCard from "../cards/FaucetCard";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#111111]">

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        <Topbar />

        <main className="flex-1 overflow-y-auto p-7">

          <div className="grid grid-cols-12 gap-5">

            {/* ================= LEFT ================= */}

            <div className="col-span-8 flex flex-col gap-5">

              {/* Balance */}
              <div className="h-[205px] flex-shrink-0">
                <BalanceCard />
              </div>

              {/* Quick Actions */}
              <div className="h-[185px] flex-shrink-0">
                <QuickActions />
              </div>

              {/* Recent Transactions */}
              <div className="h-[300px] flex-shrink-0">
                <Transactions />
              </div>

            </div>


            {/* ================= RIGHT ================= */}

            <div className="col-span-4 flex flex-col gap-5">

              {/* Arc */}
              <div className="h-[205px] flex-shrink-0">
                <ArcCard />
              </div>

              {/* Faucet */}
              <div className="h-[185px] flex-shrink-0">
                <FaucetCard />
              </div>

              {/* Portfolio */}
              <div className="h-[300px] flex-shrink-0">
                <PortfolioCard />
              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}