"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LayoutDashboard, Users, Building2, FileBarChart, LogOut, ChevronLeft, ChevronRight } from "lucide-react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "lab-users", label: "Lab Users", icon: Users },
  { id: "facilities", label: "Labs", icon: Building2 },
  { id: "reports", label: "Reports", icon: FileBarChart },
];

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userName?: string;
  userInitials?: string;
}

export default function Sidebar({ activeSection, onSectionChange, userName = "Admin", userInitials = "A" }: SidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("galrs_admin");
    sessionStorage.removeItem("galrs_admin");
    document.cookie = "galrs_session=; path=/; max-age=0";
    router.push("/login");
  }, [router]);

  return (
    <aside className={`bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0 transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      <div className={`h-16 flex items-center border-b border-gray-700 ${collapsed ? "justify-center px-2" : "px-6"}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-sm font-bold text-white tracking-tight">Admin Dashboard</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {!collapsed && <p className="sidebar-section-title font-semibold text-gray-400 uppercase px-3 mb-2">Main</p>}
        {navItems.slice(0, 1).map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`sidebar-item ${activeSection === item.id ? "active" : "text-gray-300"} w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4.5 h-4.5" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        {!collapsed && <p className="sidebar-section-title font-semibold text-gray-400 uppercase px-3 mb-2 mt-6">Management</p>}
        {navItems.slice(1, 3).map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`sidebar-item ${activeSection === item.id ? "active" : "text-gray-300"} w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4.5 h-4.5" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        {!collapsed && <p className="sidebar-section-title font-semibold text-gray-400 uppercase px-3 mb-2 mt-6">Output</p>}
        {navItems.slice(3).map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`sidebar-item ${activeSection === item.id ? "active" : "text-gray-300"} w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4.5 h-4.5" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">{userInitials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-gray-400">System Admin</p>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gray-200">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        {!collapsed && (
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        )}
        {collapsed && (
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg p-2 transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}