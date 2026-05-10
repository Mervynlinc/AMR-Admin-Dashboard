"use client";

interface StatusBadgeProps {
  status: "Active" | "Inactive" | "Published" | "Draft";
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    Active: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    Inactive: {
      bg: "bg-gray-100",
      text: "text-gray-500",
      dot: "bg-gray-400",
    },
    Published: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
    Draft: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
  };

  const c = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
      {status}
    </span>
  );
}
