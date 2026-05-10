"use client";

import { X, Bug, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ASTResult {
  antibiotic: string;
  abbreviation: string;
  result: string;
  zone_diameter_mm: number | null;
}

interface ReportDetails {
  id: string;
  report_code: string;
  remarks: string | null;
  authorised_at: string;
  sample: {
    sample_code: string;
    specimen_type: string;
    sex: string;
    age_group: string;
    patient_type: string;
    received_date: string;
  };
  isolate: {
    organism: string;
    is_mrsa: boolean;
    is_mdr: boolean;
    growth_time_hours: number | null;
  };
  astResults: ASTResult[];
}

interface ReportViewProps {
  reportId: string;
  onClose: () => void;
}

export default function ReportView({ reportId, onClose }: ReportViewProps) {
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        const { data: reportData, error: reportError } = await supabase
          .from('lab_reports')
          .select('*')
          .eq('id', reportId)
          .single();

        if (reportError || !reportData) {
          setError('Report not found');
          setLoading(false);
          return;
        }

        const { data: isolateData } = await supabase
          .from('isolates')
          .select('organism, is_mrsa, is_mdr, growth_time_hours')
          .eq('id', reportData.isolate_id)
          .single();

        const { data: sampleData } = await supabase
          .from('samples')
          .select('sample_code, specimen_type, sex, age_group, patient_type, received_date')
          .eq('id', reportData.sample_id)
          .single();

        const { data: astData } = await supabase
          .from('susceptibility_tests')
          .select('antibiotic_name, abbreviation, result, zone_diameter_mm')
          .eq('isolate_id', reportData.isolate_id);

        const formatted: ReportDetails = {
          id: reportData.id,
          report_code: reportData.report_code,
          remarks: reportData.remarks,
          authorised_at: reportData.authorised_at,
          sample: {
            sample_code: sampleData?.sample_code || 'Unknown',
            specimen_type: sampleData?.specimen_type || 'Unknown',
            sex: sampleData?.sex || 'Unknown',
            age_group: sampleData?.age_group || 'Unknown',
            patient_type: sampleData?.patient_type || 'Unknown',
            received_date: sampleData?.received_date || '',
          },
          isolate: {
            organism: isolateData?.organism || 'Unknown',
            is_mrsa: isolateData?.is_mrsa || false,
            is_mdr: isolateData?.is_mdr || false,
            growth_time_hours: isolateData?.growth_time_hours || null,
          },
          astResults: (astData || [])
            .filter((r) => r.result !== null)
            .map((r) => ({
              antibiotic: r.antibiotic_name || 'Unknown',
              abbreviation: r.abbreviation || '',
              result: r.result,
              zone_diameter_mm: r.zone_diameter_mm,
            })),
        };
        setReport(formatted);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report');
      }
      setLoading(false);
    };

    fetchReportDetails();
  }, [reportId]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'R': return { bg: 'bg-red-50', badge: 'bg-red-600', text: 'text-red-700' };
      case 'I': return { bg: 'bg-amber-50', badge: 'bg-amber-600', text: 'text-amber-700' };
      case 'S': return { bg: 'bg-green-50', badge: 'bg-green-600', text: 'text-green-700' };
      default: return { bg: 'bg-gray-50', badge: 'bg-gray-600', text: 'text-gray-700' };
    }
  };

  const getResistanceContext = (isMRSA: boolean) => {
    if (isMRSA) {
      return "MRSA detected. Avoid beta-lactams. Consider Vancomycin or Linezolid based on susceptibility.";
    }
    return "MSSA detected. Beta-lactams such as Oxacillin remain effective. Confirm full susceptibility panel before prescribing.";
  };

  const downloadPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(5, 118, 87);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("MUST Microbiology Laboratory", 14, 15);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${report.isolate.organism} Susceptibility Report`, 14, 28);

    let yPos = 50;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Sample Information", 14, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    const sampleInfo = [
      ["Sample ID", report.sample.sample_code],
      ["Date", formatDate(report.sample.received_date)],
      ["Specimen", report.sample.specimen_type],
      ["Sex", report.sample.sex === 'M' ? 'Male' : 'Female'],
      ["Patient", report.sample.age_group],
      ["Patient Type", report.sample.patient_type],
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
    doc.text(report.isolate.organism, 14, yPos);
    yPos += 6;
    doc.setTextColor(255, 255, 255);
    if (report.isolate.is_mrsa) {
      doc.setFillColor(220, 38, 38);
    } else {
      doc.setFillColor(245, 158, 11);
    }
    doc.roundedRect(14, yPos, 80, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(report.isolate.is_mrsa ? "MRSA" : "MSSA", 18, yPos + 6);
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
    const context = getResistanceContext(report.isolate.is_mrsa);
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
    doc.text(`Sample ID: ${report.sample.sample_code} | Report: ${report.report_code}`, pageWidth / 2, yPos, { align: "center" });

    doc.save(`${report.report_code}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden relative modal-content">
        <button onClick={onClose} className="absolute top-4 right-12 text-gray-400 hover:text-gray-600 z-10">
          <Download className="w-5 h-5" onClick={(e) => { e.stopPropagation(); downloadPDF(); }} />
        </button>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading report...</p>
          </div>
        ) : error || !report ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">{error || 'Report not found'}</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[90vh]">
            <div className="bg-emerald-800 rounded-t-2xl p-5 relative">
              <p className="text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">
                MUST Microbiology Laboratory
              </p>
              <h2 className="text-xl font-bold text-white mb-3">
                {report.isolate.organism} Susceptibility Report
              </h2>
              <div className="flex flex-wrap gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Sample ID:</p>
                  <p className="text-sm font-medium text-white">{report.sample.sample_code}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Date:</p>
                  <p className="text-sm font-medium text-white">{formatDate(report.sample.received_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Specimen:</p>
                  <p className="text-sm font-medium text-white">{report.sample.specimen_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Sex:</p>
                  <p className="text-sm font-medium text-white">{report.sample.sex === 'M' ? 'Male' : 'Female'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Patient:</p>
                  <p className="text-sm font-medium text-white">{report.sample.age_group}</p>
                </div>
                {report.isolate.growth_time_hours && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Sample Maturity (Hrs):</p>
                    <p className="text-sm font-medium text-white">{report.isolate.growth_time_hours}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Organism Identified
                </p>
                <div className="flex items-center mb-3">
                  <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center mr-3">
                    <Bug className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 mb-1">{report.isolate.organism}</p>
                    <p className="text-sm text-gray-500">Gram-Positive Cocci</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${report.isolate.is_mrsa ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {report.isolate.is_mrsa ? 'Methicillin-Resistant (MRSA)' : 'Methicillin-Susceptible (MSSA)'}
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Antimicrobial Susceptibility ({report.astResults.length} Antibiotics)
                </p>
                <p className="text-xs text-gray-400 mb-3">Disc Diffusion | CLSI Guidelines</p>
                <div className="h-px bg-gray-200 mb-3" />

                {report.astResults.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No susceptibility results available</p>
                ) : (
                  report.astResults.map((ast, idx) => {
                    const colors = getResultColor(ast.result);
                    return (
                      <div key={idx} className={`flex items-center justify-between py-3 px-3 rounded-lg mb-2 ${colors.bg}`}>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{ast.antibiotic}</p>
                          <p className="text-xs text-gray-500">{ast.abbreviation}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.badge}`}>
                          <span className="text-xs font-bold text-white">{ast.result}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Local {report.isolate.organism.toUpperCase()} Resistance Context
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {getResistanceContext(report.isolate.is_mrsa)}
                </p>
              </div>

              {report.remarks && (
                <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                    Technician Remarks
                  </p>
                  <p className="text-sm text-gray-800 leading-relaxed">{report.remarks}</p>
                </div>
              )}

              <div className="mt-2 mb-4">
                <div className="h-px bg-gray-200 mb-3" />
                <p className="text-xs text-gray-400 text-center">
                  Sample ID: {report.sample.sample_code} | Report: {report.report_code}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
