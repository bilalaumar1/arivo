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

      {/* ================= SIDEBAR ================= */}
{/* Sidebar handles desktop + mobile drawer */}
<div>
  <Sidebar />
</div>

      {/* ================= MAIN ================= */}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        <Topbar />

        <main className="flex-1 overflow-y-auto p-4 lg:p-7">

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

            {/* ================= LEFT ================= */}

            <div className="col-span-1 flex min-w-0 flex-col gap-5 lg:col-span-8">

              {/* Balance */}

              <div className="h-auto flex-shrink-0 lg:h-[205px]">
                <BalanceCard />
              </div>

              {/* Quick Actions */}

              <div className="h-auto flex-shrink-0 lg:h-[185px]">
                <QuickActions />
              </div>

              {/* Recent Transactions */}

              <div className="h-auto flex-shrink-0 lg:h-[300px]">
                <Transactions />
              </div>

            </div>

            {/* ================= RIGHT ================= */}

            <div className="col-span-1 flex min-w-0 flex-col gap-5 lg:col-span-4">

              {/* Arc */}

              <div className="h-auto flex-shrink-0 lg:h-[205px]">
                <ArcCard />
              </div>

              {/* Faucet */}

              <div className="h-auto flex-shrink-0 lg:h-[185px]">
                <FaucetCard />
              </div>

              {/* Portfolio */}

              <div className="h-auto flex-shrink-0 lg:h-[300px]">
                <PortfolioCard />
              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}