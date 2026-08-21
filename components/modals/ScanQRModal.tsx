"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, ScanLine } from "lucide-react";

type ScanQRModalProps = {
  open: boolean;
  onClose: () => void;
  onScan: (
    value: string,
    type: "arivo" | "wallet"
  ) => void;
};

export default function ScanQRModal({
  open,
  onClose,
  onScan,
}: ScanQRModalProps) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function startScanner() {
      try {
        setError("");

        const { Html5Qrcode } = await import(
          "html5-qrcode"
        );

        if (!mounted) return;

        const scanner = new Html5Qrcode(
          "arivo-qr-reader"
        );

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },
          async (decodedText: string) => {
            const value = decodedText.trim();

            let type:
              | "arivo"
              | "wallet"
              | null = null;

            if (
              /^ARV-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(
                value
              )
            ) {
              type = "arivo";
            } else if (
              /^0x[a-fA-F0-9]{40}$/.test(value)
            ) {
              type = "wallet";
            }

            if (!type) {
              setError(
                "This QR code is not a valid Arivo ID or wallet address."
              );
              return;
            }

            try {
              await scanner.stop();
            } catch {}

            try {
              scanner.clear();
            } catch {}

            scannerRef.current = null;

            onScan(value, type);
          },
          () => {
            // Ignore normal scan failures
          }
        );
      } catch (err) {
        console.error(
          "QR scanner error:",
          err
        );

        setError(
          "Unable to access the camera. Please allow camera access."
        );
      }
    }

    startScanner();

    return () => {
      mounted = false;

      const scanner =
        scannerRef.current;

      if (scanner) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              scanner.clear();
            } catch {}

            scannerRef.current = null;
          });
      }
    };
  }, [open, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

      <div className="w-full max-w-lg rounded-3xl border border-[#2b2b2b] bg-[#181818] p-7 shadow-2xl">

        {/* Header */}

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-2xl font-bold text-white">
              Scan QR
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Scan an Arivo ID or wallet address.
            </p>

          </div>

          <button
            onClick={onClose}
            className="text-2xl text-zinc-500 transition hover:text-white"
          >
            <X size={24} />
          </button>

        </div>

        {/* Scanner */}

        <div className="mt-7 overflow-hidden rounded-2xl border border-[#2b2b2b] bg-black">

          <div
            id="arivo-qr-reader"
            className="min-h-[350px] w-full"
          />

        </div>

        {/* Scan icon */}

        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-zinc-500">

          <ScanLine size={17} />

          <span>
            Point your camera at a QR code
          </span>

        </div>

        {/* Error */}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Camera info */}

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-zinc-600">

          <Camera size={14} />

          <span>
            Camera access is required
          </span>

        </div>

      </div>

    </div>
  );
}