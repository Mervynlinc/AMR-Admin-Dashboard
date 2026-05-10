"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}

export default function Modal({ id, title, description, children, onClose }: ModalProps) {
  return (
    <div
      id={id}
      className="fixed inset-0 z-50 hidden flex items-center justify-center modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative modal-content">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        {description && <p className="text-xs text-gray-400 mb-5">{description}</p>}
        {children}
      </div>
    </div>
  );
}
