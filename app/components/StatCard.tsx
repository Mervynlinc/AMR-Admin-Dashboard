"use client";

import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  badge?: {
    text: string;
    type: "alert" | "monitored";
  };
  bgColor: string;
  badgeBgColor: string;
  badgeTextColor: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  bgColor,
  badgeBgColor,
  badgeTextColor,
}: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 card-hover flex flex-col">
      <div className="flex items-start justify-between mb-auto">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <div className={`stat-icon-ring ${bgColor}`}>{icon}</div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {badge && (
          <span className={`text-xs font-medium ${badgeBgColor} ${badgeTextColor} px-2 py-0.5 rounded-full`}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
    </div>
  );
}
