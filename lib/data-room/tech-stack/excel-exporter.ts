/**
 * Tech Stack Analysis Excel Exporter
 * Generates detailed Excel workbooks with multiple sheets using ExcelJS
 */

import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import type {
  TechStackAnalysisWithDetails,
  TechStackFindingWithTechnologies,
} from '@/lib/data-room/types';

// Helper to format category names
const formatCategory = (category: string): string => {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to get risk level color
const getRiskLevelColor = (riskLevel: string | null): string => {
  switch (riskLevel) {
    case 'low':
      return 'FF22C55E'; // Green
    case 'medium':
      return 'FFF59E0B'; // Yellow
    case 'high':
      return 'FFF97316'; // Orange
    case 'critical':
      return 'FFEF4444'; // Red
    default:
      return 'FF6B7280'; // Gray
  }
};

// Helper to get severity color
const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'FFEF4444';
    case 'high':
      return 'FFF97316';
    case 'medium':
      return 'FFF59E0B';
    case 'low':
      return 'FF22C55E';
    default:
      return 'FF6B7280';
  }
};

/**
 * Generate Excel workbook for tech stack analysis
 */
export const generateTechStackExcel = async (
  analysis: TechStackAnalysisWithDetails,
  findings: TechStackFindingWithTechnologies[]
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();

  // Set workbook properties
  workbook.creator = 'oppSpot';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  // Sheet 1: Executive Summary
  const summarySheet = workbook.addWorksheet('Executive Summary');

  // Title
  summarySheet.mergeCells('A1:F1');
  summarySheet.getCell('A1').value = analysis.title;
  summarySheet.getCell('A1').font = { size: 18, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 30;

  // Subtitle
  summarySheet.mergeCells('A2:F2');
  summarySheet.getCell('A2').value = 'Tech Stack Due Diligence Report';
  summarySheet.getCell('A2').font = { size: 12, italic: true };
  summarySheet.getCell('A2').alignment = { horizontal: 'center' };

  // Description
  if (analysis.description) {
    summarySheet.mergeCells('A3:F3');
    summarySheet.getCell('A3').value = analysis.description;
    summarySheet.getCell('A3').alignment = { wrapText: true };
  }

  // Metadata
  summarySheet.getCell('A5').value = 'Analysis Date:';
  summarySheet.getCell('B5').value = format(new Date(analysis.created_at), 'MMMM d, yyyy');
  summarySheet.getCell('A6').value = 'Created By:';
  summarySheet.getCell('B6').value = analysis.creator_name;
  summarySheet.getCell('A7').value = 'Status:';
  summarySheet.getCell('B7').value = analysis.status.toUpperCase();
  summarySheet.getCell('A8').value = 'Risk Level:';
  summarySheet.getCell('B8').value = analysis.risk_level?.toUpperCase() || 'N/A';
  if (analysis.risk_level) {
    summarySheet.getCell('B8').font = {
      color: { argb: getRiskLevelColor(analysis.risk_level) },
      bold: true,
    };
  }

  // Key Metrics
  summarySheet.getCell('A10').value = 'Key Metrics';
  summarySheet.getCell('A10').font = { size: 14, bold: true };

  const metricsHeaders = ['Metric', 'Value', 'Description'];
  summarySheet.addRow([]);
  summarySheet.addRow(metricsHeaders).font = { bold: true };
  summarySheet.getRow(12).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };

  const metrics = [
    ['Technologies Identified', analysis.technologies_identified, 'Total number of technologies detected'],
    ['Modernization Score', analysis.modernization_score ?? 'N/A', 'Technology modernization level (0-100)'],
    ['AI Authenticity Score', analysis.ai_authenticity_score ?? 'N/A', 'AI technology authenticity (0-100, 100=proprietary)'],
    ['Technical Debt Score', analysis.technical_debt_score ?? 'N/A', 'Technical debt assessment (0-100, higher=more debt)'],
    ['Critical Findings', analysis.critical_findings_count || 0, 'Number of critical issues found'],
    ['Documents Analyzed', analysis.documents_analyzed || 0, 'Number of documents processed'],
    ['Analysis Time', analysis.analysis_time_ms ? `${Math.round(analysis.analysis_time_ms / 1000)}s` : 'N/A', 'Time taken for analysis'],
  ];

  metrics.forEach((metric) => {
    summarySheet.addRow(metric);
  });

  // Findings Summary
  summarySheet.getCell('A22').value = 'Findings Summary';
  summarySheet.getCell('A22').font = { size: 14, bold: true };

  summarySheet.addRow([]);
  summarySheet.addRow(['Finding Type', 'Count', 'Percentage']).font = { bold: true };
  summarySheet.getRow(24).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };

  const findingTypes = [
    ['Red Flags', findings.filter((f) => f.finding_type === 'red_flag').length],
    ['Risks', findings.filter((f) => f.finding_type === 'risk').length],
    ['Opportunities', findings.filter((f) => f.finding_type === 'opportunity').length],
    ['Strengths', findings.filter((f) => f.finding_type === 'strength').length],
    ['Recommendations', findings.filter((f) => f.finding_type === 'recommendation').length],
  ];

  const totalFindings = findings.length;
  findingTypes.forEach(([type, count]) => {
    const percentage = totalFindings > 0 ? ((count as number / totalFindings) * 100).toFixed(1) : '0';
    summarySheet.addRow([type, count, `${percentage}%`]);
  });

  // Set column widths
  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 20;
  summarySheet.getColumn(3).width = 40;

  // Sheet 2: Technologies
  const techSheet = workbook.addWorksheet('Technologies');

  // Headers
  const techHeaders = [
    'Technology',
    'Version',
    'Category',
    'Authenticity',
    'Risk Score',
    'Confidence',
    'License',
    'Deprecated',
    'Outdated',
    'Security Issues',
    'Evidence Count',
    'Source',
    'Detection Method',
  ];

  techSheet.addRow(techHeaders);
  techSheet.getRow(1).font = { bold: true };
  techSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' },
  };
  techSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Add technology data
  analysis.technologies.forEach((tech) => {
    techSheet.addRow([
      tech.name,
      tech.version || 'N/A',
      formatCategory(tech.category),
      tech.authenticity || 'N/A',
      tech.risk_score || 'N/A',
      tech.confidence_score ? `${Math.round(tech.confidence_score * 100)}%` : 'N/A',
      tech.license || 'N/A',
      tech.is_deprecated ? 'Yes' : 'No',
      tech.is_outdated ? 'Yes' : 'No',
      tech.has_security_issues ? 'Yes' : 'No',
      tech.evidence_count || 0,
      tech.source_document_id ? 'Document' : 'Pattern',
      tech.detection_method || 'N/A',
    ]);
  });

  // Apply conditional formatting for risk scores
  for (let i = 2; i <= analysis.technologies.length + 1; i++) {
    const cell = techSheet.getCell(`E${i}`);
    if (cell.value && typeof cell.value === 'number') {
      if (cell.value >= 70) {
        cell.font = { color: { argb: 'FFEF4444' }, bold: true };
      } else if (cell.value >= 50) {
        cell.font = { color: { argb: 'FFF97316' }, bold: true };
      } else if (cell.value >= 30) {
        cell.font = { color: { argb: 'FFF59E0B' } };
      } else {
        cell.font = { color: { argb: 'FF22C55E' } };
      }
    }
  }

  // Auto-fit columns
  techSheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? cell.value.toString().length : 10;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  // Sheet 3: Findings
  const findingsSheet = workbook.addWorksheet('Findings');

  // Headers
  const findingHeaders = [
    'Type',
    'Severity',
    'Title',
    'Description',
    'Recommendation',
    'Impact Score',
    'Technologies',
    'Status',
  ];

  findingsSheet.addRow(findingHeaders);
  findingsSheet.getRow(1).font = { bold: true };
  findingsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' },
  };
  findingsSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Add findings data
  findings.forEach((finding) => {
    const techNames = finding.technologies?.map((t) => t.name).join(', ') || 'N/A';
    findingsSheet.addRow([
      finding.finding_type.replace('_', ' ').toUpperCase(),
      finding.severity.toUpperCase(),
      finding.title,
      finding.description,
      finding.recommendation || 'N/A',
      finding.impact_score || 'N/A',
      techNames,
      finding.is_resolved ? 'Resolved' : 'Open',
    ]);
  });

  // Apply conditional formatting for severity
  for (let i = 2; i <= findings.length + 1; i++) {
    const severityCell = findingsSheet.getCell(`B${i}`);
    if (severityCell.value) {
      const severity = severityCell.value.toString().toLowerCase();
      severityCell.font = {
        color: { argb: getSeverityColor(severity) },
        bold: true,
      };
    }
  }

  // Enable text wrapping for description and recommendation columns
  findingsSheet.getColumn(4).alignment = { wrapText: true, vertical: 'top' };
  findingsSheet.getColumn(5).alignment = { wrapText: true, vertical: 'top' };

  // Auto-fit columns
  findingsSheet.columns.forEach((column, index) => {
    if (index === 3 || index === 4) {
      // Description and Recommendation
      column.width = 60;
    } else {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(maxLength + 2, 40);
    }
  });

  // Sheet 4: Category Breakdown
  const categorySheet = workbook.addWorksheet('Category Breakdown');

  categorySheet.addRow(['Technology Category Breakdown']);
  categorySheet.getRow(1).font = { size: 16, bold: true };

  categorySheet.addRow([]);
  categorySheet.addRow(['Category', 'Count', 'Avg Risk Score']).font = { bold: true };
  categorySheet.getRow(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };

  analysis.technologies_by_category?.forEach((cat) => {
    categorySheet.addRow([
      formatCategory(cat.category),
      cat.count,
      Math.round(cat.avg_risk_score),
    ]);
  });

  categorySheet.getColumn(1).width = 25;
  categorySheet.getColumn(2).width = 15;
  categorySheet.getColumn(3).width = 20;

  // Sheet 5: AI/ML Breakdown (if applicable)
  if (analysis.ai_breakdown) {
    const aiSheet = workbook.addWorksheet('AI ML Analysis');

    aiSheet.addRow(['AI/ML Technology Analysis']);
    aiSheet.getRow(1).font = { size: 16, bold: true };

    aiSheet.addRow([]);
    aiSheet.addRow(['Authenticity Type', 'Count', 'Percentage']).font = { bold: true };
    aiSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    const aiTotal =
      analysis.ai_breakdown.proprietary +
      analysis.ai_breakdown.wrapper +
      analysis.ai_breakdown.hybrid +
      analysis.ai_breakdown.third_party +
      analysis.ai_breakdown.unknown;

    const aiTypes = [
      ['Proprietary', analysis.ai_breakdown.proprietary],
      ['GPT Wrapper', analysis.ai_breakdown.wrapper],
      ['Hybrid', analysis.ai_breakdown.hybrid],
      ['Third Party', analysis.ai_breakdown.third_party],
      ['Unknown', analysis.ai_breakdown.unknown],
    ];

    aiTypes.forEach(([type, count]) => {
      const percentage = aiTotal > 0 ? ((count as number / aiTotal) * 100).toFixed(1) : '0';
      aiSheet.addRow([type, count, `${percentage}%`]);
    });

    // Add chart comment
    aiSheet.addRow([]);
    aiSheet.addRow([
      'Note:',
      'Proprietary = Custom AI models',
      'Wrapper = Uses OpenAI/Claude APIs only',
    ]);
    aiSheet.getRow(aiSheet.lastRow!.number).font = { italic: true };

    aiSheet.getColumn(1).width = 25;
    aiSheet.getColumn(2).width = 15;
    aiSheet.getColumn(3).width = 20;
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
