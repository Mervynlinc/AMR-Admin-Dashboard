"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatCard from "./components/StatCard";
import StatusBadge from "./components/StatusBadge";
import ToastContainer, { showToast } from "./components/Toast";
import Modal from "./components/Modal";
import ReportView from "./components/ReportView";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Bug,
  Users,
  Building2,
  Microscope,
  UserCheck,
  FileBarChart,
  TestTubes,
  Plus,
  FileText,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Key,
  Pencil,
} from "lucide-react";

interface Facility {
  id: number;
  name: string;
  type: string;
  district: string;
  created: string;
}

interface Lab {
  id: string;
  name: string;
  hospital: string | null;
  district: string | null;
  created_at: string;
}

interface LabUser {
  id: string;
  name: string;
  staff_id: string;
  role: string;
  lab_id: string | null;
  is_active: boolean;
  created_at: string;
  labs?: { name: string };
}

interface Report {
  id: string;
  report_code: string;
  isolate_id: string;
  organism: string;
  is_mrsa: boolean;
  is_mdr: boolean;
  sample_code: string;
  specimen_type: string;
  sex: string;
  age_group: string;
  patient_type: string;
  received_date: string;
  authorised_at: string;
  remarks: string | null;
  growth_time_hours: number | null;
  astResults: { antibiotic: string; abbreviation: string; result: string; zone_diameter_mm: number | null }[];
}

const pageTitles: Record<string, [string, string]> = {
  dashboard: ["Dashboard", "Overview of AMR surveillance network"],
  "lab-users": ["Lab Users", "Manage laboratory technicians and staff"],
  facilities: ["Facilities & Labs", "Register and manage health facilities and laboratories"],
  reports: ["Reports", "AMR surveillance reports and publications"],
};

export default function Dashboard() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [facilities, setFacilities] = useState<Facility[]>([
    { id: 1, name: "Mbarara Regional Referral Hospital", type: "Regional Referral Hospital", district: "Mbarara", created: "2024-01-15" },
    { id: 2, name: "MUST Teaching Hospital", type: "Regional Referral Hospital", district: "Mbarara", created: "2024-01-18" },
    { id: 3, name: "Holy Innocents Hospital", type: "Private Hospital", district: "Mbarara", created: "2024-02-10" },
    { id: 4, name: "Gulu Regional Referral Hospital", type: "Regional Referral Hospital", district: "Gulu", created: "2024-03-05" },
    { id: 5, name: "Mulago National Referral Hospital", type: "Regional Referral Hospital", district: "Kampala", created: "2024-01-20" },
    { id: 6, name: "Fort Portal Regional Referral Hospital", type: "Regional Referral Hospital", district: "Fort Portal", created: "2024-04-12" },
  ]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [labUsers, setLabUsers] = useState<LabUser[]>([]);
  const [labUsersLoading, setLabUsersLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [userName, setUserName] = useState("Admin");
  const [userInitials, setUserInitials] = useState("A");
  const [labsLoading, setLabsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    mrsaCount: 0,
    mssaCount: 0,
    totalIsolates: 0,
    mrsaPercentage: '0',
    mssaPercentage: '0',
  });
  const [formLabUser, setFormLabUser] = useState({ firstName: "", lastName: "", technicianId: "", password: "", labId: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [formFacility, setFormFacility] = useState({ name: "", type: "Regional Referral Hospital", district: "Mbarara" });
  const [formLab, setFormLab] = useState({ name: "", hospital: "", district: "" });
  const [creatingLab, setCreatingLab] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<LabUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<LabUser | null>(null);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("at least 8 characters");
    if (!/[A-Z]/.test(pwd)) errors.push("one uppercase letter");
    if (!/[a-z]/.test(pwd)) errors.push("one lowercase letter");
    if (!/[0-9]/.test(pwd)) errors.push("one number");
    return errors;
  };

  const openResetPasswordModal = (user: LabUser) => {
    setResetPasswordUser(user);
    setNewPassword("");
    setShowNewPassword(false);
    openModal("resetPasswordModal");
  };

  const confirmDeleteUser = (user: LabUser) => {
    setDeleteConfirmUser(user);
    openModal("deleteUserModal");
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;

    const errors = validatePassword(newPassword);
    if (errors.length > 0) {
      showToast(`Password must have: ${errors.join(", ")}`, "error");
      return;
    }

    const { error } = await supabase
      .from('lab_users')
      .update({ password_hash: newPassword })
      .eq('id', resetPasswordUser.id);

    if (error) {
      showToast("Failed to reset password", "error");
    } else {
      showToast(`Password reset for ${resetPasswordUser.name}`, "success");
      closeModal("resetPasswordModal");
      setResetPasswordUser(null);
      setNewPassword("");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;

    const { error } = await supabase
      .from('lab_users')
      .delete()
      .eq('id', deleteConfirmUser.id);

    if (error) {
      showToast("Failed to delete user", "error");
    } else {
      setLabUsers(prev => prev.filter(u => u.id !== deleteConfirmUser.id));
      showToast(`${deleteConfirmUser.name} deleted`, "success");
      closeModal("deleteUserModal");
      setDeleteConfirmUser(null);
    }
  };

  const [editLab, setEditLab] = useState<Lab | null>(null);
  const [editLabForm, setEditLabForm] = useState({ name: "", hospital: "", district: "" });
  const [deleteLabConfirm, setDeleteLabConfirm] = useState<Lab | null>(null);

  const openEditLabModal = (lab: Lab) => {
    setEditLab(lab);
    setEditLabForm({
      name: lab.name,
      hospital: lab.hospital || "",
      district: lab.district || "",
    });
    openModal("editLabModal");
  };

  const confirmDeleteLab = (lab: Lab) => {
    setDeleteLabConfirm(lab);
    openModal("deleteLabModal");
  };

  const handleUpdateLab = async () => {
    if (!editLab) return;

    if (!editLabForm.name.trim()) {
      showToast("Lab name is required", "error");
      return;
    }

    const { error } = await supabase
      .from('labs')
      .update({
        name: editLabForm.name,
        hospital: editLabForm.hospital || null,
        district: editLabForm.district || null,
      })
      .eq('id', editLab.id);

    if (error) {
      showToast("Failed to update lab", "error");
    } else {
      setLabs(prev => prev.map(l => l.id === editLab.id ? {
        ...l,
        name: editLabForm.name,
        hospital: editLabForm.hospital || null,
        district: editLabForm.district || null,
      } : l));
      showToast(`Lab updated successfully`, "success");
      closeModal("editLabModal");
      setEditLab(null);
      setEditLabForm({ name: "", hospital: "", district: "" });
    }
  };

  const handleDeleteLab = async () => {
    if (!deleteLabConfirm) return;

    const { error } = await supabase
      .from('labs')
      .delete()
      .eq('id', deleteLabConfirm.id);

    if (error) {
      showToast("Failed to delete lab", "error");
    } else {
      setLabs(prev => prev.filter(l => l.id !== deleteLabConfirm.id));
      showToast(`${deleteLabConfirm.name} deleted`, "success");
      closeModal("deleteLabModal");
      setDeleteLabConfirm(null);
    }
  };

  useEffect(() => {
    const session = localStorage.getItem("galrs_admin") || sessionStorage.getItem("galrs_admin");
    if (!session) {
      router.push("/login");
      return;
    }

    try {
      const userData = JSON.parse(session);
      if (userData.name) {
        setUserName(userData.name);
        const initials = userData.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
        setUserInitials(initials || "A");
      }
    } catch (e) {
      console.error("Failed to parse session:", e);
    }

    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('lab_reports')
        .select(`
          id,
          report_code,
          authorised_at,
          remarks,
          isolate_id,
          isolates!inner(organism, is_mrsa, is_mdr, growth_time_hours),
          samples!inner(sample_code, specimen_type, sex, age_group, patient_type, received_date)
        `)
        .order('authorised_at', { ascending: false });
      
      if (!error && data) {
        const formattedReports = data.map((r: any) => ({
          id: r.id,
          report_code: r.report_code,
          organism: r.isolates?.organism || 'Unknown',
          is_mrsa: r.isolates?.is_mrsa || false,
          is_mdr: r.isolates?.is_mdr || false,
          sample_code: r.samples?.sample_code || 'Unknown',
          specimen_type: r.samples?.specimen_type || 'Unknown',
          sex: r.samples?.sex || 'Unknown',
          age_group: r.samples?.age_group || 'Unknown',
          patient_type: r.samples?.patient_type || 'Unknown',
          received_date: r.samples?.received_date || '',
          growth_time_hours: r.isolates?.growth_time_hours || null,
          authorised_at: r.authorised_at,
          remarks: r.remarks,
          isolate_id: r.isolate_id,
          astResults: [] as { antibiotic: string; abbreviation: string; result: string; zone_diameter_mm: number | null }[],
        }));
        setReports(formattedReports);

        for (const report of formattedReports) {
          const { data: astData } = await supabase
            .from('susceptibility_tests')
            .select('antibiotic_name, abbreviation, result, zone_diameter_mm')
            .eq('isolate_id', report.isolate_id);

          if (astData) {
            setReports(prev => prev.map(r => r.id === report.id ? {
              ...r,
              astResults: (astData || []).filter((a: any) => a.result !== null).map((a: any) => ({
                antibiotic: a.antibiotic_name || 'Unknown',
                abbreviation: a.abbreviation || '',
                result: a.result,
                zone_diameter_mm: a.zone_diameter_mm,
              }))
            } : r));
          }
        }
      }
      setReportsLoading(false);
    };

    const fetchLabs = async () => {
      const { data, error } = await supabase
        .from('labs')
        .select('*')
        .order('name');

      if (!error && data) {
        setLabs(data);
      }
      setLabsLoading(false);
    };

    fetchReports();
    fetchLabs();
    fetchLabUsers();
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    const { count: mrsaCount } = await supabase
      .from('isolates')
      .select('*', { count: 'exact', head: true })
      .eq('is_mrsa', true);
    
    const { count: totalIsolates } = await supabase
      .from('isolates')
      .select('*', { count: 'exact', head: true });

    const mssaCount = (totalIsolates || 0) - (mrsaCount || 0);
    const mrsaPct = totalIsolates ? ((mrsaCount || 0) / totalIsolates * 100).toFixed(1) : '0';
    const mssaPct = totalIsolates ? ((mssaCount) / totalIsolates * 100).toFixed(1) : '0';

    setDashboardStats({
      mrsaCount: mrsaCount || 0,
      mssaCount: mssaCount,
      totalIsolates: totalIsolates || 0,
      mrsaPercentage: mrsaPct,
      mssaPercentage: mssaPct,
    });
  };

  const fetchLabUsers = async () => {
    const { data, error } = await supabase
      .from('lab_users')
      .select('*, labs(name)')
      .order('name');

    if (!error && data) {
      setLabUsers(data);
    }
    setLabUsersLoading(false);
  };

  const nextFacilityId = facilities.length + 1;
  const nextUserId = labUsers.length + 1;

  const openModal = (id: string) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  };

  const closeModal = (id: string) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  };

  const getFacilityName = (id: number) => facilities.find((f) => f.id === id)?.name || "Unknown";
  const getLabName = (labId: string) => labs.find((l) => l.id === labId)?.name || "Unknown";
  const getAssignmentName = (facilityId: string) => {
    if (facilityId.startsWith("lab-")) return getLabName(facilityId.replace("lab-", ""));
    if (facilityId.startsWith("fac-")) return getFacilityName(parseInt(facilityId.replace("fac-", "")));
    return "Unassigned";
  };
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getResistanceContext = (isMRSA: boolean) => {
    if (isMRSA) {
      return "MRSA detected. Avoid beta-lactams. Consider Vancomycin or Linezolid based on susceptibility.";
    }
    return "MSSA detected. Beta-lactams such as Oxacillin remain effective. Confirm full susceptibility panel before prescribing.";
  };

  const downloadReportPDF = (report: Report) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(5, 118, 87);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("MUST Microbiology Laboratory", 14, 15);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${report.organism} Susceptibility Report`, 14, 28);

    let yPos = 50;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Sample Information", 14, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    const sampleInfo = [
      ["Sample ID", report.sample_code],
      ["Date", formatDate(report.received_date)],
      ["Specimen", report.specimen_type],
      ["Sex", report.sex === 'M' ? 'Male' : 'Female'],
      ["Patient", report.age_group],
      ["Patient Type", report.patient_type],
    ];
    sampleInfo.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label + ":", 14, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(value, 60, yPos);
      yPos += 6;
    });

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Organism Identified", 14, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.text(report.organism, 14, yPos);
    yPos += 6;
    doc.setTextColor(255, 255, 255);
    if (report.is_mrsa) {
      doc.setFillColor(220, 38, 38);
    } else {
      doc.setFillColor(245, 158, 11);
    }
    doc.roundedRect(14, yPos, 80, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(report.is_mrsa ? "MRSA" : "MSSA", 18, yPos + 6);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Antimicrobial Susceptibility (${report.astResults.length} Antibiotics)`, 14, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Disc Diffusion | CLSI Guidelines", 14, yPos);
    yPos += 8;
    doc.setFontSize(10);

    autoTable(doc, {
      startY: yPos,
      head: [["Antibiotic", "Abbreviation", "Result"]],
      body: report.astResults.map((r) => [r.antibiotic, r.abbreviation, r.result]),
      theme: "striped",
      headStyles: { fillColor: [5, 118, 87] },
      columnStyles: {
        2: { cellWidth: 20, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === "body") {
          const result = data.cell.raw as string;
          if (result === "R") {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [220, 38, 38];
          } else if (result === "I") {
            data.cell.styles.fillColor = [254, 245, 226];
            data.cell.styles.textColor = [245, 158, 11];
          } else if (result === "S") {
            data.cell.styles.fillColor = [209, 250, 229];
            data.cell.styles.textColor = [5, 118, 87];
          }
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Local Resistance Context", 14, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    const context = getResistanceContext(report.is_mrsa);
    const splitContext = doc.splitTextToSize(context, pageWidth - 28);
    doc.text(splitContext, 14, yPos);
    yPos += splitContext.length * 5 + 5;

    if (report.remarks) {
      doc.setFont("helvetica", "bold");
      doc.text("Technician Remarks", 14, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      const splitRemarks = doc.splitTextToSize(report.remarks, pageWidth - 28);
      doc.text(splitRemarks, 14, yPos);
      yPos += splitRemarks.length * 5;
    }

    yPos += 10;
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Sample ID: ${report.sample_code} | Report: ${report.report_code}`, pageWidth / 2, yPos, { align: "center" });

    doc.save(`${report.report_code}.pdf`);
  };

  const toggleUserStatus = async (userId: string) => {
    const user = labUsers.find((u) => u.id === userId);
    if (!user) return;

    const { error } = await supabase
      .from('lab_users')
      .update({ is_active: !user.is_active })
      .eq('id', userId);

    if (!error) {
      setLabUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u))
      );
      showToast(`${user.name} ${!user.is_active ? "activated" : "deactivated"}`);
    }
  };

  const deleteUser = async (userId: string) => {
    const user = labUsers.find((u) => u.id === userId);
    if (!user) return;

    const { error } = await supabase
      .from('lab_users')
      .delete()
      .eq('id', userId);

    if (!error) {
      setLabUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(`${user.name} removed`);
    }
  };

  const createLabUser = async () => {
    if (!formLabUser.firstName || !formLabUser.lastName || !formLabUser.technicianId || !formLabUser.password) {
      showToast("Please fill in all fields", "error");
      return;
    }

    if (formLabUser.password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    if (!/[A-Z]/.test(formLabUser.password)) {
      showToast("Password must contain at least one uppercase letter", "error");
      return;
    }
    if (!/[a-z]/.test(formLabUser.password)) {
      showToast("Password must contain at least one lowercase letter", "error");
      return;
    }
    if (!/[0-9]/.test(formLabUser.password)) {
      showToast("Password must contain at least one number", "error");
      return;
    }

    const { data, error } = await supabase
      .from('lab_users')
      .insert({
        name: `${formLabUser.firstName} ${formLabUser.lastName}`,
        staff_id: formLabUser.technicianId,
        password_hash: formLabUser.password,
        role: 'lab_tech',
        is_active: true,
        lab_id: formLabUser.labId || null,
      })
      .select('*, labs(name)')
      .single();

    if (error) {
      if (error.code === '23505') {
        showToast("User with this Technician ID already exists", "error");
      } else {
        showToast("Failed to create user", "error");
      }
      return;
    }

    setLabUsers((prev) => [...prev, data]);
    setFormLabUser({ firstName: "", lastName: "", technicianId: "", password: "", labId: "" });
    closeModal("addLabUserModal");
    showToast(`${data.name} created successfully`);
  };

  const createFacility = () => {
    if (!formFacility.name) {
      showToast("Please enter a facility name", "error");
      return;
    }
    const newFacility: Facility = { id: nextFacilityId, name: formFacility.name, type: formFacility.type, district: formFacility.district, created: new Date().toISOString().split("T")[0] };
    setFacilities((prev) => [...prev, newFacility]);
    setFormFacility({ name: "", type: "Regional Referral Hospital", district: "Mbarara" });
    closeModal("addFacilityModal");
    showToast("Facility registered successfully");
  };

  const createLab = async () => {
    if (!formLab.name.trim()) {
      showToast("Please enter a lab name", "error");
      return;
    }

    // Check for duplicates
    const exists = labs.find(l => l.name.toLowerCase() === formLab.name.trim().toLowerCase());
    if (exists) {
      showToast("A lab with this name already exists", "error");
      return;
    }

    setCreatingLab(true);

    const { data, error } = await supabase
      .from('labs')
      .insert({
        name: formLab.name.trim(),
        hospital: formLab.hospital || null,
        district: formLab.district || null,
      })
      .select()
      .single();

    setCreatingLab(false);

    if (error) {
      showToast("Failed to create lab", "error");
      return;
    }

    setLabs((prev) => [...prev, data]);
    setFormLab({ name: "", hospital: "", district: "" });
    closeModal("addLabModal");
    showToast("Laboratory registered successfully");
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch = !searchQuery || r.report_code.toLowerCase().includes(searchQuery.toLowerCase()) || r.organism.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !dateFilter || r.authorised_at.startsWith(dateFilter);
    return matchesSearch && matchesDate;
  });

  const handleDownload = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    downloadReportPDF(report);
  };

  const filteredLabUsers = labUsers.filter((u) => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.labs?.name && u.labs.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredLabs = labs.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || (l.hospital && l.hospital.toLowerCase().includes(searchQuery.toLowerCase())) || (l.district && l.district.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} userName={userName} userInitials={userInitials} />
      <main className="flex-1 overflow-y-auto">
        <Header title={pageTitles[activeSection]?.[0] || "Dashboard"} subtitle={pageTitles[activeSection]?.[1] || ""} onSearch={setSearchQuery} />
        <div className="p-8">
          {activeSection === "dashboard" && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="MRSA Detected" value={`${dashboardStats.mrsaPercentage}%`} subtitle={`of ${dashboardStats.totalIsolates} total isolates`} icon={<Bug className="w-5 h-5 text-red-600" />} bgColor="bg-red-50" badgeBgColor="" badgeTextColor="" />
                <StatCard title="MSSA Detected" value={`${dashboardStats.mssaPercentage}%`} subtitle={`of ${dashboardStats.totalIsolates} total isolates`} icon={<Bug className="w-5 h-5 text-amber-600" />} bgColor="bg-amber-50" badgeBgColor="" badgeTextColor="" />
                <StatCard title="Lab Technicians" value={labUsers.length} subtitle="registered in the system" icon={<Users className="w-5 h-5 text-blue-600" />} bgColor="bg-blue-50" badgeBgColor="" badgeTextColor="" />
                <StatCard title="Active Laboratories" value={labs.length} subtitle="currently operational" icon={<Microscope className="w-5 h-5 text-violet-600" />} bgColor="bg-violet-50" badgeBgColor="" badgeTextColor="" />
                <StatCard title="Active Lab Technicians" value={labUsers.filter((u) => u.is_active).length} subtitle="registered and active" icon={<UserCheck className="w-5 h-5 text-teal-600" />} bgColor="bg-teal-50" badgeBgColor="" badgeTextColor="" />
                <StatCard title="Published Reports" value={reports.length} subtitle="in the database" icon={<FileBarChart className="w-5 h-5 text-indigo-600" />} bgColor="bg-indigo-50" badgeBgColor="" badgeTextColor="" />
                <StatCard title="Total Isolates" value={dashboardStats.totalIsolates} subtitle="in the database" icon={<TestTubes className="w-5 h-5 text-pink-600" />} bgColor="bg-pink-50" badgeBgColor="" badgeTextColor="" />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Lab Users</h3>
                  <p className="text-xs text-gray-400 mt-0.5">All registered lab technicians and staff</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Staff ID</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Laboratory</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLabUsers.map((u) => (
                        <tr key={u.id} className="table-row">
                          <td className="px-6 py-3.5">
                            <p className="text-sm font-medium text-gray-900">{u.name}</p>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-gray-600">{u.staff_id}</td>
                          <td className="px-6 py-3.5 text-sm text-gray-600">{u.labs?.name || '—'}</td>
                          <td className="px-6 py-3.5"><StatusBadge status={u.is_active ? "Active" : "Inactive"} /></td>
                          <td className="px-6 py-3.5 text-sm text-gray-500">{formatDate(u.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeSection === "lab-users" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Lab Users</h3>
                  <p className="text-xs text-gray-400 mt-0.5">All registered lab technicians and staff</p>
                </div>
                <button onClick={() => openModal("addLabUserModal")} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors">
                  <Plus className="w-4 h-4" /> Add Lab User
                </button>
              </div>
              {labUsersLoading ? (
                <div className="p-8 text-center text-gray-500">Loading users...</div>
              ) : filteredLabUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No lab users found</div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Staff ID</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Laboratory</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLabUsers.map((u) => (
                      <tr key={u.id} className="table-row">
                        <td className="px-6 py-3.5">
                          <p className="text-sm font-medium text-gray-900">{u.name}</p>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-600">{u.staff_id}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-600">{u.labs?.name || '—'}</td>
                        <td className="px-6 py-3.5"><StatusBadge status={u.is_active ? "Active" : "Inactive"} /></td>
                        <td className="px-6 py-3.5 text-sm text-gray-500">{formatDate(u.created_at)}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openResetPasswordModal(u)}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                              Reset
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => confirmDeleteUser(u)}
                              className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}
          {activeSection === "facilities" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Microbiology Laboratories</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Manage microbiology laboratories</p>
                </div>
                <button onClick={() => openModal("addLabModal")} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors">
                  <Plus className="w-4 h-4" /> Add Lab
                </button>
              </div>
              {labsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading labs...</div>
              ) : filteredLabs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No labs found</div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Laboratory Name</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Associated Hospital</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">District</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLabs.map((l) => (
                      <tr key={l.id} className="table-row">
                        <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{l.name}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-600">{l.hospital || '—'}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-600">{l.district || '—'}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-500">{formatDate(l.created_at)}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditLabModal(l)}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                              title="Edit Lab"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => confirmDeleteLab(l)}
                              className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
                              title="Delete Lab"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}
          {activeSection === "reports" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Published Reports</h3>
                  <p className="text-xs text-gray-400 mt-0.5">AMR surveillance reports generated from the system</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="month"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {dateFilter && (
                    <button onClick={() => setDateFilter("")} className="text-xs text-gray-500 hover:text-gray-700">
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {reportsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading reports...</div>
              ) : filteredReports.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No reports found</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredReports.map((r) => (
                    <div key={r.id} onClick={() => setSelectedReportId(r.id)} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${r.is_mrsa ? "bg-red-50" : "bg-amber-50"}`}>
                          <FileText className={`w-5 h-5 ${r.is_mrsa ? "text-red-600" : "text-amber-600"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.report_code}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.authorised_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.is_mrsa ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                          {r.is_mrsa ? "MRSA" : "MSSA"}
                        </span>
                        <button onClick={(e) => handleDownload(e, r)} className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ToastContainer />

      <Modal id="addLabUserModal" title="Create Lab User" description="Add a new technician or staff to the system" onClose={() => closeModal("addLabUserModal")}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" value={formLabUser.firstName} onChange={(e) => setFormLabUser({ ...formLabUser, firstName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., John" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" value={formLabUser.lastName} onChange={(e) => setFormLabUser({ ...formLabUser, lastName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Mugisha" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician ID</label>
            <input type="text" value={formLabUser.technicianId} onChange={(e) => setFormLabUser({ ...formLabUser, technicianId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., TECH-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={formLabUser.password} onChange={(e) => setFormLabUser({ ...formLabUser, password: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10" placeholder="Min 8 chars, uppercase, lowercase, number" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Min 8 chars with uppercase, lowercase, and number</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Laboratory <span className="text-gray-400">(optional)</span></label>
            <select value={formLabUser.labId} onChange={(e) => setFormLabUser({ ...formLabUser, labId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">-- Select Laboratory --</option>
              {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => closeModal("addLabUserModal")} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={createLabUser} className="px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800">Create User</button>
          </div>
        </div>
      </Modal>

      <Modal id="resetPasswordModal" title="Reset Password" onClose={() => closeModal("resetPasswordModal")}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Reset password for <span className="font-semibold text-gray-900">{resetPasswordUser?.name}</span> ({resetPasswordUser?.staff_id})
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                placeholder="Min 8 chars with uppercase, lowercase, number"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Min 8 chars with uppercase, lowercase, and number</p>
            {newPassword && validatePassword(newPassword).length > 0 && (
              <p className="text-xs text-red-500 mt-1">Password must have: {validatePassword(newPassword).join(", ")}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => closeModal("resetPasswordModal")} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleResetPassword} className="px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800">Reset Password</button>
          </div>
        </div>
      </Modal>

      <Modal id="deleteUserModal" title="Delete User" onClose={() => closeModal("deleteUserModal")}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
            <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Are you sure you want to delete this user?</p>
              <p className="text-xs text-red-600 mt-1">
                This will permanently delete <span className="font-semibold">{deleteConfirmUser?.name}</span> ({deleteConfirmUser?.staff_id}) from the system.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => closeModal("deleteUserModal")} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleDeleteUser} className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete User</button>
          </div>
        </div>
      </Modal>

      <Modal id="addFacilityModal" title="Register Health Facility" onClose={() => closeModal("addFacilityModal")}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facility Name</label>
            <input type="text" value={formFacility.name} onChange={(e) => setFormFacility({ ...formFacility, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Holy Innocents Hospital" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facility Type</label>
            <select value={formFacility.type} onChange={(e) => setFormFacility({ ...formFacility, type: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option>Regional Referral Hospital</option>
              <option>District Hospital</option>
              <option>Health Center IV</option>
              <option>Private Hospital</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
            <select value={formFacility.district} onChange={(e) => setFormFacility({ ...formFacility, district: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option>Mbarara</option>
              <option>Kampala</option>
              <option>Gulu</option>
              <option>Fort Portal</option>
              <option>Jinja</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => closeModal("addFacilityModal")} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={createFacility} className="px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800">Save Facility</button>
          </div>
        </div>
      </Modal>

      <Modal id="addLabModal" title="Register Laboratory" onClose={() => closeModal("addLabModal")}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Laboratory Name <span className="text-red-500">*</span></label>
            <input type="text" value={formLab.name} onChange={(e) => setFormLab({ ...formLab, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Fort Portal Micro Lab" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Associated Hospital <span className="text-gray-400">(optional)</span></label>
            <input type="text" value={formLab.hospital} onChange={(e) => setFormLab({ ...formLab, hospital: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Mbarara Regional Referral Hospital" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District <span className="text-gray-400">(optional)</span></label>
            <input type="text" value={formLab.district} onChange={(e) => setFormLab({ ...formLab, district: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Mbarara" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => closeModal("addLabModal")} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={createLab} disabled={creatingLab} className="px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
              {creatingLab ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeDashoffset="10"/></svg>
                  Saving...
                </>
              ) : "Save Laboratory"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal id="editLabModal" title="Edit Laboratory" onClose={() => closeModal("editLabModal")}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Laboratory Name <span className="text-red-500">*</span></label>
            <input type="text" value={editLabForm.name} onChange={(e) => setEditLabForm({ ...editLabForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Fort Portal Micro Lab" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Associated Hospital <span className="text-gray-400">(optional)</span></label>
            <input type="text" value={editLabForm.hospital} onChange={(e) => setEditLabForm({ ...editLabForm, hospital: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Mbarara Regional Referral Hospital" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District <span className="text-gray-400">(optional)</span></label>
            <input type="text" value={editLabForm.district} onChange={(e) => setEditLabForm({ ...editLabForm, district: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Mbarara" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => closeModal("editLabModal")} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleUpdateLab} className="px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800">Update Lab</button>
          </div>
        </div>
      </Modal>

      <Modal id="deleteLabModal" title="Delete Laboratory" onClose={() => closeModal("deleteLabModal")}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
            <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Are you sure you want to delete this lab?</p>
              <p className="text-xs text-red-600 mt-1">
                This will permanently delete <span className="font-semibold">{deleteLabConfirm?.name}</span> from the system.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => closeModal("deleteLabModal")} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleDeleteLab} className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete Lab</button>
          </div>
        </div>
      </Modal>

      {selectedReportId && (
        <ReportView reportId={selectedReportId} onClose={() => setSelectedReportId(null)} />
      )}
    </div>
  );
}
