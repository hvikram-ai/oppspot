/**
 * Demo Data Room Documents
 * Pre-seeded documents with AI classifications for live demo mode
 *
 * These demonstrate the AI-powered document classification feature
 * with realistic financial and due diligence documents.
 */

import type { Document, DocumentWithAnalysis, DocumentType } from '@/lib/data-room/types';

// ============================================================================
// DEMO DATA ROOM
// ============================================================================

export const demoDataRoomId = 'demo-dataroom-001';

export const demoDataRoomInfo = {
  id: demoDataRoomId,
  user_id: 'demo-user',
  company_id: 'demo-1', // TechHub Solutions
  name: 'TechHub Solutions - Due Diligence 2024',
  description: 'M&A due diligence data room for potential acquisition of TechHub Solutions. Contains financial records, contracts, legal documents, and HR materials.',
  deal_type: 'acquisition' as const,
  status: 'active' as const,
  storage_used_bytes: 52428800, // ~50MB
  document_count: 5,
  metadata: {
    deal_value: 15000000,
    currency: 'GBP',
    target_close_date: '2024-12-31',
    retention_days: 180,
    tags: ['M&A', 'Technology', 'SaaS', 'UK'],
  },
  created_at: '2024-08-01T10:00:00Z',
  updated_at: '2024-08-25T15:30:00Z',
  deleted_at: null,
};

// ============================================================================
// DEMO DOCUMENTS WITH AI CLASSIFICATIONS
// ============================================================================

export const demoDocument1: Document = {
  id: 'demo-doc-001',
  data_room_id: demoDataRoomId,

  // File information
  filename: 'Financial_Statements_FY2023_2024.pdf',
  folder_path: '/Financials',
  file_size_bytes: 12582912, // 12MB
  mime_type: 'application/pdf',
  storage_path: 'demo-data-rooms/demo-dataroom-001/Financial_Statements_FY2023_2024.pdf',

  // Upload tracking
  uploaded_by: 'demo-user',
  upload_completed: true,

  // AI classification
  document_type: 'financial',
  confidence_score: 0.94,
  processing_status: 'complete',

  // Extracted metadata
  metadata: {
    dates: ['2023-04-01', '2024-03-31'],
    amounts: [
      { value: 6500000, currency: 'GBP', context: 'Annual Revenue' },
      { value: 780000, currency: 'GBP', context: 'EBITDA' },
      { value: 1200000, currency: 'GBP', context: 'Total Assets' },
    ],
    parties: [
      { name: 'TechHub Solutions Ltd', type: 'company', role: 'Subject Company' },
      { name: 'PricewaterhouseCoopers LLP', type: 'company', role: 'Auditor' },
    ],
    document_date: '2024-06-30',
    fiscal_period: 'FY 2023-24',
  },

  // Error handling
  error_message: null,

  // Timestamps
  created_at: '2024-08-15T10:00:00Z',
  updated_at: '2024-08-15T10:02:45Z',
  deleted_at: null,
};

export const demoDocument2: Document = {
  id: 'demo-doc-002',
  data_room_id: demoDataRoomId,

  filename: 'Master_Services_Agreement_Acme_Corp.pdf',
  folder_path: '/Contracts/Customer_Agreements',
  file_size_bytes: 5242880, // 5MB
  mime_type: 'application/pdf',
  storage_path: 'demo-data-rooms/demo-dataroom-001/Master_Services_Agreement_Acme_Corp.pdf',

  uploaded_by: 'demo-user',
  upload_completed: true,

  document_type: 'contract',
  confidence_score: 0.91,
  processing_status: 'complete',

  metadata: {
    dates: ['2023-01-15', '2026-01-14'],
    amounts: [
      { value: 450000, currency: 'GBP', context: 'Annual Contract Value' },
    ],
    parties: [
      { name: 'TechHub Solutions Ltd', type: 'company', role: 'Service Provider' },
      { name: 'Acme Corporation UK Ltd', type: 'company', role: 'Customer' },
    ],
    contract_parties: ['TechHub Solutions Ltd', 'Acme Corporation UK Ltd'],
    contract_value: 450000,
    effective_date: '2023-01-15',
    expiration_date: '2026-01-14',
  },

  error_message: null,

  created_at: '2024-08-15T11:00:00Z',
  updated_at: '2024-08-15T11:01:32Z',
  deleted_at: null,
};

export const demoDocument3: Document = {
  id: 'demo-doc-003',
  data_room_id: demoDataRoomId,

  filename: 'Articles_of_Association.pdf',
  folder_path: '/Legal/Corporate_Structure',
  file_size_bytes: 2097152, // 2MB
  mime_type: 'application/pdf',
  storage_path: 'demo-data-rooms/demo-dataroom-001/Articles_of_Association.pdf',

  uploaded_by: 'demo-user',
  upload_completed: true,

  document_type: 'legal',
  confidence_score: 0.96,
  processing_status: 'complete',

  metadata: {
    dates: ['2018-06-01', '2021-03-20'],
    parties: [
      { name: 'TechHub Solutions Ltd', type: 'company', role: 'Subject Company' },
    ],
    document_date: '2021-03-20',
  },

  error_message: null,

  created_at: '2024-08-15T12:00:00Z',
  updated_at: '2024-08-15T12:00:58Z',
  deleted_at: null,
};

export const demoDocument4: Document = {
  id: 'demo-doc-004',
  data_room_id: demoDataRoomId,

  filename: 'Employee_Headcount_Report_Q2_2024.pdf',
  folder_path: '/HR/Headcount',
  file_size_bytes: 1572864, // 1.5MB
  mime_type: 'application/pdf',
  storage_path: 'demo-data-rooms/demo-dataroom-001/Employee_Headcount_Report_Q2_2024.pdf',

  uploaded_by: 'demo-user',
  upload_completed: true,

  document_type: 'hr',
  confidence_score: 0.89,
  processing_status: 'complete',

  metadata: {
    dates: ['2024-04-01', '2024-06-30'],
    amounts: [
      { value: 72, currency: 'GBP', context: 'Total Headcount' },
      { value: 58000, currency: 'GBP', context: 'Average Salary' },
    ],
    document_date: '2024-07-15',
  },

  error_message: null,

  created_at: '2024-08-15T13:00:00Z',
  updated_at: '2024-08-15T13:01:12Z',
  deleted_at: null,
};

export const demoDocument5: Document = {
  id: 'demo-doc-005',
  data_room_id: demoDataRoomId,

  filename: 'Customer_Due_Diligence_Questionnaire.pdf',
  folder_path: '/Due_Diligence',
  file_size_bytes: 3145728, // 3MB
  mime_type: 'application/pdf',
  storage_path: 'demo-data-rooms/demo-dataroom-001/Customer_Due_Diligence_Questionnaire.pdf',

  uploaded_by: 'demo-user',
  upload_completed: true,

  document_type: 'due_diligence',
  confidence_score: 0.87,
  processing_status: 'complete',

  metadata: {
    dates: ['2024-08-01'],
    parties: [
      { name: 'TechHub Solutions Ltd', type: 'company', role: 'Target Company' },
      { name: 'Strategic Acquisitions plc', type: 'company', role: 'Acquirer' },
    ],
    document_date: '2024-08-01',
  },

  error_message: null,

  created_at: '2024-08-15T14:00:00Z',
  updated_at: '2024-08-15T14:01:45Z',
  deleted_at: null,
};

// ============================================================================
// DOCUMENT COLLECTIONS
// ============================================================================

export const demoDocuments: Document[] = [
  demoDocument1,
  demoDocument2,
  demoDocument3,
  demoDocument4,
  demoDocument5,
];

export const demoDocumentsById: Record<string, Document> = {
  'demo-doc-001': demoDocument1,
  'demo-doc-002': demoDocument2,
  'demo-doc-003': demoDocument3,
  'demo-doc-004': demoDocument4,
  'demo-doc-005': demoDocument5,
};

// ============================================================================
// DOCUMENT LIST ITEMS (for UI)
// ============================================================================

export const demoDocumentListItems = demoDocuments.map((doc) => ({
  id: doc.id,
  filename: doc.filename,
  document_type: doc.document_type,
  file_size_bytes: doc.file_size_bytes,
  created_at: doc.created_at,
  uploaded_by_name: 'Demo User',
  processing_status: doc.processing_status,
  confidence_score: doc.confidence_score,
}));

// ============================================================================
// FOLDER STRUCTURE
// ============================================================================

export const demoFolderStructure = [
  {
    path: '/Financials',
    name: 'Financials',
    document_count: 1,
    documents: [demoDocument1],
  },
  {
    path: '/Contracts',
    name: 'Contracts',
    document_count: 1,
    children: [
      {
        path: '/Contracts/Customer_Agreements',
        name: 'Customer Agreements',
        document_count: 1,
        documents: [demoDocument2],
      },
    ],
  },
  {
    path: '/Legal',
    name: 'Legal',
    document_count: 1,
    children: [
      {
        path: '/Legal/Corporate_Structure',
        name: 'Corporate Structure',
        document_count: 1,
        documents: [demoDocument3],
      },
    ],
  },
  {
    path: '/HR',
    name: 'HR',
    document_count: 1,
    children: [
      {
        path: '/HR/Headcount',
        name: 'Headcount',
        document_count: 1,
        documents: [demoDocument4],
      },
    ],
  },
  {
    path: '/Due_Diligence',
    name: 'Due Diligence',
    document_count: 1,
    documents: [demoDocument5],
  },
];

// ============================================================================
// DOCUMENT TYPE SUMMARY (for analytics)
// ============================================================================

export const demoDocumentTypeSummary = {
  financial: { count: 1, total_size_bytes: 12582912 },
  contract: { count: 1, total_size_bytes: 5242880 },
  legal: { count: 1, total_size_bytes: 2097152 },
  hr: { count: 1, total_size_bytes: 1572864 },
  due_diligence: { count: 1, total_size_bytes: 3145728 },
  other: { count: 0, total_size_bytes: 0 },
};
