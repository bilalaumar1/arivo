 "use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, ScanLine } from "lucide-react";
import { useI18n } from "@/lib/i18n/useI18n";

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
  const { t } = useI18n();

  const scannerRef = useRef<any>(null);
  const [error, setError] = useState("");

  function translateWithFallback(
    key: string,
    fallback: string
  ) {
    const value = t("common", key);
    return value === key ? fallback : value;
  }

  const scanQRDescription = translateWithFallback(
    "scanQRDescription",
    "Scan an Arivo ID or wallet address QR code."
  );

  const pointCameraAtQR = translateWithFallback(
    "pointCameraAtQR",
    "Point your camera at a QR code"
  );

  const cameraAccessRequired = translateWithFallback(
    "cameraAccessRequired",
    "Camera access is required to scan QR codes."
  );

  const invalidArivoQR = translateWithFallback(
    "invalidArivoQR",
    "Invalid Arivo QR code."
  );

  const cameraAccessError = translateWithFallback(
    "cameraAccessError",
    "Unable to access the camera."
  );

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
              setError(invalidArivoQR);
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

        setError(cameraAccessError);
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
  }, [
    open,
    onScan,
    invalidArivoQR,
    cameraAccessError,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#2b2b2b] bg-[#181818] p-5 shadow-2xl sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              {t("common", "scanQR")}
            </h2>

            <p className="mt-2 text-sm leading-5 text-zinc-500">
              {scanQRDescription}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("common", "close")}
            className="shrink-0 text-zinc-500 transition hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        {/* Scanner */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#2b2b2b] bg-black sm:mt-7">
          <div
            id="arivo-qr-reader"
            className="min-h-[280px] w-full sm:min-h-[350px]"
          />
        </div>

        {/* Scan icon */}
        <div className="mt-4 flex items-center justify-center gap-2 px-2 text-center text-sm leading-5 text-zinc-500 sm:mt-5">
          <ScanLine size={17} className="shrink-0" />

          <span>
            {pointCameraAtQR}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Camera info */}
        <div className="mt-4 flex items-center justify-center gap-2 px-2 text-center text-xs leading-5 text-zinc-600 sm:mt-5">
          <Camera size={14} className="shrink-0" />

          <span>
            {cameraAccessRequired}
          </span>
        </div>
      </div>
    </div>
  );
}
