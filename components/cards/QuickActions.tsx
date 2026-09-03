"use client";

import { useState } from "react";

import {
  ArrowUpRight,
  ArrowDown,
  ScanLine,
  CircleDollarSign,
  ArrowLeftRight,
} from "lucide-react";

import SendModal from "@/components/modals/SendModal";
import ReceiveModal from "@/components/modals/ReceiveModal";
import ScanQRModal from "@/components/modals/ScanQRModal";
import AddMoneyModal from "@/components/modals/AddMoneyModal";
import ConvertModal from "@/components/modals/ConvertModal";

const actions = [
  {
    title: "Send",
    icon: ArrowUpRight,
    active: true,
  },
  {
    title: "Receive",
    icon: ArrowDown,
    active: false,
  },
  {
    title: "Scan QR",
    icon: ScanLine,
    active: false,
  },
  {
    title: "Add Money",
    icon: CircleDollarSign,
    active: false,
  },
  {
    title: "Convert",
    icon: ArrowLeftRight,
    active: false,
  },
];

export default function QuickActions() {
  const [openSend, setOpenSend] = useState(false);

  const [openReceive, setOpenReceive] = useState(false);

  const [openScan, setOpenScan] = useState(false);

  const [openAddMoney, setOpenAddMoney] = useState(false);

  const [openConvert, setOpenConvert] = useState(false);

  const [scannedRecipient, setScannedRecipient] = useState("");

  const [scannedMethod, setScannedMethod] =
    useState<"arivo" | "wallet">("arivo");

  return (
    <>
      {/* Title */}

      <h2 className="mb-4 mt-3 ml-5 text-[17px] font-semibold text-white lg:mb-5 lg:mt-0 lg:ml-0">
  Quick Actions
</h2>

      {/* Actions */}

      <div className="grid grid-cols-5 gap-2 lg:gap-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              onClick={() => {
                {/* Send */}

                if (action.title === "Send") {
                  setOpenSend(true);
                }

                {/* Receive */}

                if (action.title === "Receive") {
                  setOpenReceive(true);
                }

                {/* Scan QR */}

                if (action.title === "Scan QR") {
                  setOpenScan(true);
                }

                {/* Add Money */}

                if (action.title === "Add Money") {
                  setOpenAddMoney(true);
                }

                {/* Convert */}

                if (action.title === "Convert") {
                  setOpenConvert(true);
                }
              }}
              className="group flex min-w-0 flex-col items-center"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition lg:h-16 lg:w-16 ${
                  action.active
                    ? "border-[#efe5d2] bg-[#efe5d2] text-black"
                    : "border-[#353535] bg-[#202020] text-white hover:border-[#555]"
                }`}
              >
                <Icon
                  size={21}
                  strokeWidth={2}
                  className="lg:h-[22px] lg:w-[22px]"
                />
              </div>

              <span className="mt-2 whitespace-nowrap text-[11px] leading-tight text-zinc-300 lg:mt-3 lg:text-[13px] lg:leading-normal">
                {action.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Send */}

      <SendModal
        open={openSend}
        onClose={() => {
          setOpenSend(false);
          setScannedRecipient("");
        }}
        initialRecipient={scannedRecipient}
        initialMethod={scannedMethod}
      />

      {/* Receive */}

      <ReceiveModal
        open={openReceive}
        onClose={() => setOpenReceive(false)}
      />

      {/* Scan QR */}

      <ScanQRModal
        open={openScan}
        onClose={() => setOpenScan(false)}
        onScan={(value, method) => {
          setScannedRecipient(value);
          setScannedMethod(method);

          setOpenScan(false);
          setOpenSend(true);
        }}
      />

      {/* Add Money */}

      <AddMoneyModal
        open={openAddMoney}
        onClose={() => setOpenAddMoney(false)}
      />

      {/* Convert */}

      <ConvertModal
        open={openConvert}
        onClose={() => setOpenConvert(false)}
      />
    </>
  );
}