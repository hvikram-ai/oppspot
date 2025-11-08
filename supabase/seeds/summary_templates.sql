-- Seed Data: System Summary Templates
-- Pre-configured templates for common contract and corporate document types

-- =====================================================
-- MASTER SERVICE AGREEMENT (MSA) TEMPLATE
-- =====================================================

INSERT INTO public.summary_templates (org_id, key, title, description, doc_type, version, active, required_coverage, min_confidence)
VALUES (
  NULL, -- system template
  'msa_standard',
  'Master Service Agreement',
  'Standard MSA with parties, terms, fees, SLA, liability, and governance',
  'contract',
  '1.0',
  TRUE,
  0.85,
  0.75
) ON CONFLICT (org_id, key) DO NOTHING;

INSERT INTO public.summary_fields (template_id, key, title, description, field_type, required, source_hint, normalizer, order_index)
SELECT
  (SELECT id FROM public.summary_templates WHERE key = 'msa_standard'),
  key, title, description, field_type::TEXT, required, source_hint, normalizer, order_index
FROM (VALUES
  ('parties_provider', 'Service Provider', 'Legal name of the service provider', 'string', TRUE, 'First page, recitals, signature block', NULL, 1),
  ('parties_customer', 'Customer', 'Legal name of the customer/client', 'string', TRUE, 'First page, recitals, signature block', NULL, 2),
  ('effective_date', 'Effective Date', 'Date when the agreement becomes effective', 'date', TRUE, 'First page, preamble', '{"format": "ISO8601"}', 3),
  ('term_length', 'Initial Term', 'Length of the initial contract term', 'duration', TRUE, 'Term section', '{"unit": "months"}', 4),
  ('auto_renewal', 'Auto-Renewal', 'Whether contract auto-renews', 'boolean', TRUE, 'Term and termination section', NULL, 5),
  ('renewal_term', 'Renewal Term', 'Length of renewal periods if auto-renews', 'duration', FALSE, 'Term and termination section', '{"unit": "months"}', 6),
  ('termination_notice', 'Termination Notice Period', 'Notice required for termination', 'duration', TRUE, 'Termination section', '{"unit": "days"}', 7),
  ('termination_for_cause', 'Termination for Cause Allowed', 'Whether either party can terminate for cause', 'boolean', FALSE, 'Termination section', NULL, 8),
  ('fees_structure', 'Fee Structure', 'How fees are structured', 'enum', FALSE, 'Fees and payment section', '{"values": ["fixed", "hourly", "usage-based", "tiered", "mixed"]}', 9),
  ('payment_terms', 'Payment Terms', 'When and how payment is due', 'string', TRUE, 'Fees and payment section', NULL, 10),
  ('sla_included', 'SLA Included', 'Whether SLA/performance guarantees are included', 'boolean', FALSE, 'Service levels, SLA section', NULL, 11),
  ('sla_uptime', 'SLA Uptime %', 'Guaranteed uptime percentage', 'number', FALSE, 'SLA section', '{"min": 0, "max": 100}', 12),
  ('liability_cap', 'Liability Cap', 'Maximum liability limit', 'currency', TRUE, 'Limitation of liability section', '{"currency": "USD"}', 13),
  ('liability_cap_multiplier', 'Liability Cap Multiplier', 'Cap expressed as multiple of fees', 'string', FALSE, 'Limitation of liability section', NULL, 14),
  ('mfn_clause', 'Most Favored Nation Clause', 'Whether MFN pricing is included', 'boolean', FALSE, 'Pricing section', NULL, 15),
  ('assignment_restricted', 'Assignment Restrictions', 'Whether assignment is restricted', 'boolean', FALSE, 'General provisions, assignment section', NULL, 16),
  ('governing_law', 'Governing Law', 'Jurisdiction governing the agreement', 'string', TRUE, 'General provisions, governing law section', NULL, 17),
  ('dispute_resolution', 'Dispute Resolution', 'Method for resolving disputes', 'enum', FALSE, 'Dispute resolution section', '{"values": ["litigation", "arbitration", "mediation", "negotiation"]}', 18),
  ('notice_address_provider', 'Provider Notice Address', 'Address for legal notices to provider', 'string', FALSE, 'Notices section', NULL, 19),
  ('notice_address_customer', 'Customer Notice Address', 'Address for legal notices to customer', 'string', FALSE, 'Notices section', NULL, 20)
) AS v(key, title, description, field_type, required, source_hint, normalizer, order_index)
ON CONFLICT (template_id, key) DO NOTHING;

-- =====================================================
-- ORDER FORM TEMPLATE
-- =====================================================

INSERT INTO public.summary_templates (org_id, key, title, description, doc_type, version, active, required_coverage, min_confidence)
VALUES (
  NULL,
  'order_form_standard',
  'Order Form / Statement of Work',
  'Purchase order or SOW with products, pricing, and delivery',
  'contract',
  '1.0',
  TRUE,
  0.80,
  0.70
) ON CONFLICT (org_id, key) DO NOTHING;

INSERT INTO public.summary_fields (template_id, key, title, description, field_type, required, source_hint, normalizer, order_index)
SELECT
  (SELECT id FROM public.summary_templates WHERE key = 'order_form_standard'),
  key, title, description, field_type::TEXT, required, source_hint, normalizer, order_index
FROM (VALUES
  ('order_number', 'Order Number', 'Purchase order or SOW number', 'string', TRUE, 'Header, first page', NULL, 1),
  ('order_date', 'Order Date', 'Date of the order', 'date', TRUE, 'Header, first page', '{"format": "ISO8601"}', 2),
  ('buyer_name', 'Buyer', 'Purchasing entity', 'string', TRUE, 'Header, parties section', NULL, 3),
  ('seller_name', 'Seller', 'Selling entity', 'string', TRUE, 'Header, parties section', NULL, 4),
  ('products_services', 'Products/Services', 'List of items being purchased', 'json', TRUE, 'Line items, schedule', NULL, 5),
  ('total_amount', 'Total Amount', 'Total purchase price', 'currency', TRUE, 'Summary, totals section', '{"currency": "USD"}', 6),
  ('payment_schedule', 'Payment Schedule', 'When payments are due', 'string', FALSE, 'Payment terms section', NULL, 7),
  ('delivery_date', 'Delivery Date', 'Expected delivery or completion date', 'date', FALSE, 'Delivery section', '{"format": "ISO8601"}', 8),
  ('shipping_terms', 'Shipping Terms', 'Who pays for shipping', 'string', FALSE, 'Delivery section', NULL, 9),
  ('warranty_period', 'Warranty Period', 'Length of warranty if applicable', 'duration', FALSE, 'Warranty section', '{"unit": "months"}', 10)
) AS v(key, title, description, field_type, required, source_hint, normalizer, order_index)
ON CONFLICT (template_id, key) DO NOTHING;

-- =====================================================
-- NDA TEMPLATE
-- =====================================================

INSERT INTO public.summary_templates (org_id, key, title, description, doc_type, version, active, required_coverage, min_confidence)
VALUES (
  NULL,
  'nda_standard',
  'Non-Disclosure Agreement',
  'Mutual or one-way NDA with confidentiality obligations',
  'contract',
  '1.0',
  TRUE,
  0.90,
  0.80
) ON CONFLICT (org_id, key) DO NOTHING;

INSERT INTO public.summary_fields (template_id, key, title, description, field_type, required, source_hint, normalizer, order_index)
SELECT
  (SELECT id FROM public.summary_templates WHERE key = 'nda_standard'),
  key, title, description, field_type::TEXT, required, source_hint, normalizer, order_index
FROM (VALUES
  ('nda_type', 'NDA Type', 'Mutual or one-way', 'enum', TRUE, 'Preamble, recitals', '{"values": ["mutual", "one-way", "unilateral"]}', 1),
  ('party1_name', 'Party 1 Name', 'First party to the NDA', 'string', TRUE, 'Preamble, signature block', NULL, 2),
  ('party2_name', 'Party 2 Name', 'Second party to the NDA', 'string', TRUE, 'Preamble, signature block', NULL, 3),
  ('effective_date', 'Effective Date', 'When NDA becomes effective', 'date', TRUE, 'Preamble', '{"format": "ISO8601"}', 4),
  ('term_length', 'Term', 'Duration of confidentiality obligation', 'duration', TRUE, 'Term section', '{"unit": "years"}', 5),
  ('disclosing_party', 'Disclosing Party', 'Who is disclosing confidential info (one-way only)', 'string', FALSE, 'Definitions, recitals', NULL, 6),
  ('receiving_party', 'Receiving Party', 'Who is receiving confidential info (one-way only)', 'string', FALSE, 'Definitions, recitals', NULL, 7),
  ('permitted_use', 'Permitted Use', 'Allowed uses of confidential information', 'string', FALSE, 'Obligations section', NULL, 8),
  ('return_destroy_upon', 'Return/Destroy Upon', 'When confidential info must be returned or destroyed', 'string', FALSE, 'Return obligations section', NULL, 9),
  ('governing_law', 'Governing Law', 'Jurisdiction', 'string', TRUE, 'General provisions', NULL, 10)
) AS v(key, title, description, field_type, required, source_hint, normalizer, order_index)
ON CONFLICT (template_id, key) DO NOTHING;

-- =====================================================
-- CORPORATE PROFILE TEMPLATE
-- =====================================================

INSERT INTO public.summary_templates (org_id, key, title, description, doc_type, version, active, required_coverage, min_confidence)
VALUES (
  NULL,
  'corporate_profile',
  'Corporate Profile',
  'Company overview with products, leadership, and certifications',
  'corporate_profile',
  '1.0',
  TRUE,
  0.75,
  0.70
) ON CONFLICT (org_id, key) DO NOTHING;

INSERT INTO public.summary_fields (template_id, key, title, description, field_type, required, source_hint, normalizer, order_index)
SELECT
  (SELECT id FROM public.summary_templates WHERE key = 'corporate_profile'),
  key, title, description, field_type::TEXT, required, source_hint, normalizer, order_index
FROM (VALUES
  ('company_name', 'Company Name', 'Legal name of the company', 'string', TRUE, 'Cover page, about section', NULL, 1),
  ('founded_year', 'Founded', 'Year company was founded', 'number', FALSE, 'About, history section', '{"min": 1800, "max": 2100}', 2),
  ('headquarters', 'Headquarters', 'Primary office location', 'string', FALSE, 'About, contact section', NULL, 3),
  ('company_overview', 'Overview', 'Brief company description', 'richtext', TRUE, 'About, overview section', NULL, 4),
  ('products_services', 'Products & Services', 'Main products and services offered', 'richtext', TRUE, 'Products, services section', NULL, 5),
  ('target_markets', 'Target Markets', 'Industries or markets served', 'json', FALSE, 'Markets, customers section', NULL, 6),
  ('employee_count', 'Employee Count', 'Number of employees', 'number', FALSE, 'About, company facts', '{"min": 0}', 7),
  ('revenue', 'Annual Revenue', 'Annual revenue if disclosed', 'currency', FALSE, 'Financials, about section', '{"currency": "USD"}', 8),
  ('leadership_team', 'Leadership Team', 'Key executives and their titles', 'json', FALSE, 'Leadership, management section', NULL, 9),
  ('office_locations', 'Office Locations', 'List of office locations', 'json', FALSE, 'Locations, contact section', NULL, 10),
  ('certifications', 'Certifications', 'Industry certifications held', 'json', FALSE, 'Certifications, compliance section', NULL, 11),
  ('esg_highlights', 'ESG Highlights', 'Environmental, social, governance initiatives', 'richtext', FALSE, 'ESG, sustainability section', NULL, 12),
  ('website', 'Website', 'Company website URL', 'string', FALSE, 'Contact section', NULL, 13)
) AS v(key, title, description, field_type, required, source_hint, normalizer, order_index)
ON CONFLICT (template_id, key) DO NOTHING;

-- =====================================================
-- POLICY TEMPLATE
-- =====================================================

INSERT INTO public.summary_templates (org_id, key, title, description, doc_type, version, active, required_coverage, min_confidence)
VALUES (
  NULL,
  'policy_standard',
  'Corporate Policy',
  'Internal policy document with scope, requirements, and enforcement',
  'policy',
  '1.0',
  TRUE,
  0.80,
  0.75
) ON CONFLICT (org_id, key) DO NOTHING;

INSERT INTO public.summary_fields (template_id, key, title, description, field_type, required, source_hint, normalizer, order_index)
SELECT
  (SELECT id FROM public.summary_templates WHERE key = 'policy_standard'),
  key, title, description, field_type::TEXT, required, source_hint, normalizer, order_index
FROM (VALUES
  ('policy_name', 'Policy Name', 'Title of the policy', 'string', TRUE, 'Cover page, header', NULL, 1),
  ('policy_number', 'Policy Number', 'Policy ID or number', 'string', FALSE, 'Header, first page', NULL, 2),
  ('effective_date', 'Effective Date', 'When policy takes effect', 'date', TRUE, 'Header, approval section', '{"format": "ISO8601"}', 3),
  ('version', 'Version', 'Policy version number', 'string', FALSE, 'Header', NULL, 4),
  ('policy_owner', 'Policy Owner', 'Department or person responsible', 'string', FALSE, 'Ownership, approval section', NULL, 5),
  ('scope', 'Scope', 'Who the policy applies to', 'string', TRUE, 'Scope section', NULL, 6),
  ('purpose', 'Purpose', 'Why the policy exists', 'richtext', TRUE, 'Purpose, objective section', NULL, 7),
  ('key_requirements', 'Key Requirements', 'Main policy requirements', 'richtext', TRUE, 'Requirements, policy section', NULL, 8),
  ('exceptions', 'Exceptions', 'Allowed exceptions to policy', 'string', FALSE, 'Exceptions section', NULL, 9),
  ('enforcement', 'Enforcement', 'How policy is enforced', 'string', FALSE, 'Enforcement, compliance section', NULL, 10),
  ('review_frequency', 'Review Frequency', 'How often policy is reviewed', 'duration', FALSE, 'Review section', '{"unit": "months"}', 11)
) AS v(key, title, description, field_type, required, source_hint, normalizer, order_index)
ON CONFLICT (template_id, key) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify templates were created
DO $$
DECLARE
  template_count INT;
  field_count INT;
BEGIN
  SELECT COUNT(*) INTO template_count FROM public.summary_templates WHERE org_id IS NULL;
  SELECT COUNT(*) INTO field_count FROM public.summary_fields;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Summary Templates Seed Data';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Created % system templates', template_count;
  RAISE NOTICE 'Created % total fields', field_count;
  RAISE NOTICE '==============================================';

  IF template_count = 5 THEN
    RAISE NOTICE '✅ All templates created successfully';
  ELSE
    RAISE WARNING '⚠️  Expected 5 templates, got %', template_count;
  END IF;
END $$;
