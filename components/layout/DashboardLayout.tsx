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
      <div>
        <Sidebar />
      </div>

      {/* ================= MAIN ================= */}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        <Topbar />

        <main className="flex-1 overflow-y-auto p-4 lg:p-7">

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

            {/* ================= BALANCE ================= */}

            <div
              className="
                order-1
                col-span-1
                min-w-0
                h-auto
                flex-shrink-0
                lg:col-span-8
                lg:row-start-1
                lg:h-[205px]
              "
            >
              <BalanceCard />
            </div>

            {/* ================= ARC ================= */}

            <div
              className="
                order-6
                col-span-1
                min-w-0
                h-auto
                flex-shrink-0
                lg:col-span-4
                lg:row-start-1
                lg:h-[205px]
              "
            >
              <ArcCard />
            </div>

            {/* ================= QUICK ACTIONS ================= */}

            <div
              className="
                order-2
                col-span-1
                min-w-0
                h-auto
                flex-shrink-0
                lg:col-span-8
                lg:row-start-2
                lg:h-[185px]
              "
            >
              <QuickActions />
            </div>

            {/* ================= EXCHANGE RATES ================= */}

            <div
              className="
                order-4
                col-span-1
                min-w-0
                h-auto
                flex-shrink-0
                lg:col-span-4
                lg:row-start-2
                lg:h-[185px]
              "
            >
              <FaucetCard />
            </div>

            {/* ================= RECENT TRANSACTIONS ================= */}

            <div
              className="
                order-3
                col-span-1
                min-w-0
                h-auto
                flex-shrink-0
                lg:col-span-8
                lg:row-start-3
                lg:h-[300px]
              "
            >
              <Transactions />
            </div>

            {/* ================= PORTFOLIO ================= */}

            <div
              className="
                order-5
                col-span-1
                min-w-0
                h-auto
                flex-shrink-0
                lg:col-span-4
                lg:row-start-3
                lg:h-[300px]
              "
            >
              <PortfolioCard />
            </div>

          </div>

        </main>

      </div>

    </div>
  );
}