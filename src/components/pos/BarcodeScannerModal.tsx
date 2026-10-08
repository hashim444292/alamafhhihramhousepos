"use client";

import React, { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, Camera } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    let scanner: Html5QrcodeScanner | null = null;

    try {
      scanner = new Html5QrcodeScanner(
        "barcode-scanner-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          rememberLastUsedCamera: true,
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          onScanSuccess(decodedText);
          scanner?.clear();
          onClose();
        },
        (_errorMessage) => {
          // scanner scanning error, keep scanning
        }
      );
    } catch (e) {
      console.error("Camera scanner init failed:", e);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [isOpen, onScanSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Scan Product Barcode</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col items-center">
          <p className="text-xs text-slate-500 mb-3 text-center">
            Point camera at the barcode on the Ihram set or accessory packaging
          </p>
          <div id="barcode-scanner-reader" className="w-full rounded-lg overflow-hidden border" />
        </div>
      </div>
    </div>
  );
};
