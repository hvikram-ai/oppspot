/**
 * Demo Q&A Queries
 * Pre-seeded Q&A conversation history for live demo mode
 *
 * These demonstrate the AI-powered Q&A Copilot feature with:
 * - Natural language questions
 * - Grounded answers with citations
 * - Document deep-linking
 * - Various question types (financial, legal, operational)
 */

import type {
  QAQuery,
  QACitation,
  CitationResponse,
  HistoricalQuery,
  QueryResponse,
} from '@/types/data-room-qa';

// ============================================================================
// DEMO Q&A QUERIES WITH FULL DATA
// ============================================================================

export const demoQuery1: QAQuery = {
  id: 'demo-qa-001',
  user_id: 'demo-user',
  data_room_id: 'demo-dataroom-001',
  question: 'What was TechHub Solutions\' revenue and EBITDA for the last fiscal year?',
  answer: 'Based on the Financial Statements for FY 2023-24, TechHub Solutions generated £6.5 million in annual revenue with an EBITDA of £780,000, representing a 12% EBITDA margin. The financial statements were audited by PricewaterhouseCoopers LLP and cover the period from April 1, 2023 to March 31, 2024.',
  answer_type: 'grounded',
  model_used: 'claude-3-5-sonnet-20241022',

  // Performance metrics
  retrieval_time_ms: 245,
  llm_time_ms: 3420,
  total_time_ms: 3665,
  chunks_retrieved: 8,
  tokens_input: 2150,
  tokens_output: 87,

  // Error tracking
  error_type: null,
  error_message: null,
  retry_count: 0,

  // Timestamps
  created_at: '2024-08-25T14:30:00Z',
  completed_at: '2024-08-25T14:30:04Z',
};

export const demoCitations1: QACitation[] = [
  {
    id: 'demo-cite-001-1',
    query_id: 'demo-qa-001',
    chunk_id: 'demo-chunk-001-03',
    document_id: 'demo-doc-001',
    page_number: 3,
    relevance_score: 0.94,
    rank: 1,
    text_preview: 'Revenue for the fiscal year ended March 31, 2024 was £6,500,000, representing a 35% increase from the prior year. Earnings before interest, taxes, depreciation, and amortization (EBITDA) was £780,000, or 12.0% of revenue.',
    citation_format: 'inline',
    created_at: '2024-08-25T14:30:04Z',
  },
  {
    id: 'demo-cite-001-2',
    query_id: 'demo-qa-001',
    chunk_id: 'demo-chunk-001-01',
    document_id: 'demo-doc-001',
    page_number: 1,
    relevance_score: 0.87,
    rank: 2,
    text_preview: 'Independent Auditor\'s Report: We have audited the accompanying financial statements of TechHub Solutions Ltd for the year ended March 31, 2024. PricewaterhouseCoopers LLP, London.',
    citation_format: 'inline',
    created_at: '2024-08-25T14:30:04Z',
  },
];

export const demoQuery2: QAQuery = {
  id: 'demo-qa-002',
  user_id: 'demo-user',
  data_room_id: 'demo-dataroom-001',
  question: 'What is the contract value and duration of the Acme Corp agreement?',
  answer: 'The Master Services Agreement with Acme Corporation UK Ltd has an annual contract value of £450,000. The agreement is effective from January 15, 2023 and expires on January 14, 2026, making it a 3-year contract. TechHub Solutions serves as the Service Provider under this agreement.',
  answer_type: 'grounded',
  model_used: 'claude-3-5-sonnet-20241022',

  retrieval_time_ms: 198,
  llm_time_ms: 2890,
  total_time_ms: 3088,
  chunks_retrieved: 6,
  tokens_input: 1845,
  tokens_output: 72,

  error_type: null,
  error_message: null,
  retry_count: 0,

  created_at: '2024-08-25T14:32:00Z',
  completed_at: '2024-08-25T14:32:03Z',
};

export const demoCitations2: QACitation[] = [
  {
    id: 'demo-cite-002-1',
    query_id: 'demo-qa-002',
    chunk_id: 'demo-chunk-002-02',
    document_id: 'demo-doc-002',
    page_number: 2,
    relevance_score: 0.96,
    rank: 1,
    text_preview: 'Annual Contract Value: £450,000 (Four Hundred Fifty Thousand Pounds Sterling). Effective Date: January 15, 2023. Expiration Date: January 14, 2026. This Master Services Agreement is entered into between TechHub Solutions Ltd ("Service Provider") and Acme Corporation UK Ltd ("Customer").',
    citation_format: 'inline',
    created_at: '2024-08-25T14:32:03Z',
  },
];

export const demoQuery3: QAQuery = {
  id: 'demo-qa-003',
  user_id: 'demo-user',
  data_room_id: 'demo-dataroom-001',
  question: 'How many employees does TechHub have and what is the average salary?',
  answer: 'According to the Employee Headcount Report for Q2 2024 (covering April 1 to June 30, 2024), TechHub Solutions has 72 total employees. The average salary across the organization is £58,000. This represents a 44% year-over-year increase in headcount, reflecting the company\'s rapid growth phase.',
  answer_type: 'grounded',
  model_used: 'claude-3-5-sonnet-20241022',

  retrieval_time_ms: 210,
  llm_time_ms: 3125,
  total_time_ms: 3335,
  chunks_retrieved: 7,
  tokens_input: 1920,
  tokens_output: 79,

  error_type: null,
  error_message: null,
  retry_count: 0,

  created_at: '2024-08-25T14:35:00Z',
  completed_at: '2024-08-25T14:35:03Z',
};

export const demoCitations3: QACitation[] = [
  {
    id: 'demo-cite-003-1',
    query_id: 'demo-qa-003',
    chunk_id: 'demo-chunk-004-01',
    document_id: 'demo-doc-004',
    page_number: 1,
    relevance_score: 0.92,
    rank: 1,
    text_preview: 'Total Headcount as of June 30, 2024: 72 employees. Average Salary: £58,000. Headcount Growth Year-over-Year: 44% (increase from 50 to 72 employees). Departmental Breakdown: Engineering 45 (62.5%), Sales & Marketing 12 (16.7%), Operations 8 (11.1%), Finance & Admin 7 (9.7%).',
    citation_format: 'inline',
    created_at: '2024-08-25T14:35:03Z',
  },
];

export const demoQuery4: QAQuery = {
  id: 'demo-qa-004',
  user_id: 'demo-user',
  data_room_id: 'demo-dataroom-001',
  question: 'When was the company incorporated and have there been any changes to the articles?',
  answer: 'TechHub Solutions Ltd was incorporated on June 1, 2018. The Articles of Association were most recently amended on March 20, 2021, likely in connection with their Series A funding round. The current articles govern the company\'s corporate structure and shareholder rights.',
  answer_type: 'grounded',
  model_used: 'claude-3-5-sonnet-20241022',

  retrieval_time_ms: 189,
  llm_time_ms: 2750,
  total_time_ms: 2939,
  chunks_retrieved: 5,
  tokens_input: 1680,
  tokens_output: 68,

  error_type: null,
  error_message: null,
  retry_count: 0,

  created_at: '2024-08-25T14:38:00Z',
  completed_at: '2024-08-25T14:38:03Z',
};

export const demoCitations4: QACitation[] = [
  {
    id: 'demo-cite-004-1',
    query_id: 'demo-qa-004',
    chunk_id: 'demo-chunk-003-01',
    document_id: 'demo-doc-003',
    page_number: 1,
    relevance_score: 0.91,
    rank: 1,
    text_preview: 'Articles of Association of TechHub Solutions Ltd. Company Number: 10234567. Date of Incorporation: June 1, 2018. These amended Articles of Association were adopted by Special Resolution on March 20, 2021, replacing all previous articles.',
    citation_format: 'inline',
    created_at: '2024-08-25T14:38:03Z',
  },
];

export const demoQuery5: QAQuery = {
  id: 'demo-qa-005',
  user_id: 'demo-user',
  data_room_id: 'demo-dataroom-001',
  question: 'What are the key risk factors mentioned in the due diligence questionnaire?',
  answer: 'The Customer Due Diligence Questionnaire identifies several key considerations for the potential acquisition of TechHub Solutions by Strategic Acquisitions plc. While specific risk factors are detailed throughout the document, the questionnaire was completed on August 1, 2024 and covers standard due diligence areas including financial performance, customer concentration, technology infrastructure, regulatory compliance, and employee retention.',
  answer_type: 'grounded',
  model_used: 'claude-3-5-sonnet-20241022',

  retrieval_time_ms: 267,
  llm_time_ms: 3890,
  total_time_ms: 4157,
  chunks_retrieved: 9,
  tokens_input: 2340,
  tokens_output: 95,

  error_type: null,
  error_message: null,
  retry_count: 0,

  created_at: '2024-08-25T14:42:00Z',
  completed_at: '2024-08-25T14:42:04Z',
};

export const demoCitations5: QACitation[] = [
  {
    id: 'demo-cite-005-1',
    query_id: 'demo-qa-005',
    chunk_id: 'demo-chunk-005-02',
    document_id: 'demo-doc-005',
    page_number: 2,
    relevance_score: 0.88,
    rank: 1,
    text_preview: 'Customer Due Diligence Questionnaire for TechHub Solutions Ltd. Date: August 1, 2024. Prepared for: Strategic Acquisitions plc. This questionnaire covers financial performance, customer contracts, intellectual property, regulatory compliance, and operational matters relevant to the proposed acquisition.',
    citation_format: 'inline',
    created_at: '2024-08-25T14:42:04Z',
  },
];

export const demoQuery6: QAQuery = {
  id: 'demo-qa-006',
  user_id: 'demo-user',
  data_room_id: 'demo-dataroom-001',
  question: 'What is the total asset value of the company?',
  answer: 'According to the Financial Statements for FY 2023-24, TechHub Solutions has total assets of £1,200,000. This represents the company\'s balance sheet position as of March 31, 2024, as audited by PricewaterhouseCoopers LLP.',
  answer_type: 'grounded',
  model_used: 'claude-3-5-sonnet-20241022',

  retrieval_time_ms: 203,
  llm_time_ms: 2650,
  total_time_ms: 2853,
  chunks_retrieved: 6,
  tokens_input: 1790,
  tokens_output: 64,

  error_type: null,
  error_message: null,
  retry_count: 0,

  created_at: '2024-08-25T14:45:00Z',
  completed_at: '2024-08-25T14:45:03Z',
};

export const demoCitations6: QACitation[] = [
  {
    id: 'demo-cite-006-1',
    query_id: 'demo-qa-006',
    chunk_id: 'demo-chunk-001-05',
    document_id: 'demo-doc-001',
    page_number: 5,
    relevance_score: 0.93,
    rank: 1,
    text_preview: 'Balance Sheet as of March 31, 2024. Total Assets: £1,200,000. Current Assets: £850,000 (including cash £320,000, accounts receivable £480,000, prepaid expenses £50,000). Non-current Assets: £350,000 (including property & equipment £200,000, intangible assets £150,000).',
    citation_format: 'inline',
    created_at: '2024-08-25T14:45:03Z',
  },
];

// ============================================================================
// COLLECTIONS
// ============================================================================

export const demoQueries: QAQuery[] = [
  demoQuery1,
  demoQuery2,
  demoQuery3,
  demoQuery4,
  demoQuery5,
  demoQuery6,
];

export const demoCitationsByQueryId: Record<string, QACitation[]> = {
  'demo-qa-001': demoCitations1,
  'demo-qa-002': demoCitations2,
  'demo-qa-003': demoCitations3,
  'demo-qa-004': demoCitations4,
  'demo-qa-005': demoCitations5,
  'demo-qa-006': demoCitations6,
};

// ============================================================================
// API RESPONSE FORMATS (for UI components)
// ============================================================================

export const demoHistoricalQueries: HistoricalQuery[] = demoQueries.map((query, index) => ({
  query_id: query.id,
  question: query.question,
  answer: query.answer,
  answer_type: query.answer_type,
  created_at: query.created_at,
  citation_count: Object.values(demoCitationsByQueryId)[index]?.length || 0,
  feedback_rating: index % 3 === 0 ? 'helpful' : null, // Some have feedback
  total_time_ms: query.total_time_ms,
}));

export const demoCitationResponses: Record<string, CitationResponse[]> = Object.fromEntries(
  Object.entries(demoCitationsByQueryId).map(([queryId, citations]) => [
    queryId,
    citations.map((cite) => ({
      document_id: cite.document_id,
      document_title: getDocumentTitle(cite.document_id),
      page_number: cite.page_number,
      chunk_id: cite.chunk_id,
      relevance_score: cite.relevance_score,
      text_preview: cite.text_preview,
      rank: cite.rank,
    })),
  ])
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDocumentTitle(documentId: string): string {
  const titles: Record<string, string> = {
    'demo-doc-001': 'Financial_Statements_FY2023_2024.pdf',
    'demo-doc-002': 'Master_Services_Agreement_Acme_Corp.pdf',
    'demo-doc-003': 'Articles_of_Association.pdf',
    'demo-doc-004': 'Employee_Headcount_Report_Q2_2024.pdf',
    'demo-doc-005': 'Customer_Due_Diligence_Questionnaire.pdf',
  };
  return titles[documentId] || 'Unknown Document';
}

export function getDemoQueryResponse(queryId: string): QueryResponse | null {
  const query = demoQueries.find((q) => q.id === queryId);
  if (!query) return null;

  const citations = demoCitationsByQueryId[queryId] || [];

  return {
    query_id: query.id,
    question: query.question,
    answer: query.answer || '',
    answer_type: query.answer_type as 'grounded' | 'insufficient_evidence',
    citations: citations.map((cite) => ({
      document_id: cite.document_id,
      document_title: getDocumentTitle(cite.document_id),
      page_number: cite.page_number,
      chunk_id: cite.chunk_id,
      relevance_score: cite.relevance_score,
      text_preview: cite.text_preview,
      rank: cite.rank,
    })),
    metrics: {
      total_time_ms: query.total_time_ms || 0,
      retrieval_time_ms: query.retrieval_time_ms || 0,
      llm_time_ms: query.llm_time_ms || 0,
      chunks_retrieved: query.chunks_retrieved || 0,
      citation_count: citations.length,
      tokens_input: query.tokens_input,
      tokens_output: query.tokens_output,
      model_used: query.model_used,
    },
  };
}

// ============================================================================
// ANALYTICS DATA
// ============================================================================

export const demoQAAnalytics = {
  total_queries: demoQueries.length,
  avg_latency_ms: Math.round(
    demoQueries.reduce((sum, q) => sum + (q.total_time_ms || 0), 0) / demoQueries.length
  ),
  p95_latency_ms: 4200,
  abstention_rate: 0, // No abstentions in demo data
  avg_citations: Math.round(
    Object.values(demoCitationsByQueryId).reduce((sum, cites) => sum + cites.length, 0) /
      demoQueries.length
  ),
  helpful_rate: 33, // 2 out of 6 have helpful feedback
  top_questions: [
    { question: 'What was TechHub Solutions\' revenue and EBITDA for the last fiscal year?', count: 1 },
    { question: 'What is the contract value and duration of the Acme Corp agreement?', count: 1 },
    { question: 'How many employees does TechHub have and what is the average salary?', count: 1 },
  ],
};
