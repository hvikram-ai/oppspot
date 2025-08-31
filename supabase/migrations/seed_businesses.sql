-- Seed sample business data for testing

INSERT INTO businesses (
  name,
  description,
  address,
  latitude,
  longitude,
  phone_numbers,
  emails,
  website,
  categories,
  rating,
  verified,
  google_place_id
) VALUES 
(
  'TechStart Solutions',
  'Leading technology consulting firm specializing in digital transformation and cloud solutions for enterprises.',
  jsonb_build_object(
    'street', '123 Tech Street',
    'city', 'London',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'EC1A 1BB'
  ),
  51.5074,
  -0.1278,
  '["020 1234 5678", "020 1234 5679"]'::jsonb,
  '["info@techstart.co.uk", "support@techstart.co.uk"]'::jsonb,
  'https://techstart.co.uk',
  ARRAY['Technology', 'Consulting', 'Professional Services'],
  4.8,
  true,
  'ChIJ1234567890'
),
(
  'Green Earth Cafe',
  'Eco-friendly cafe serving organic, locally-sourced food and beverages. Vegan and vegetarian options available.',
  jsonb_build_object(
    'street', '456 High Street',
    'city', 'Manchester',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'M1 1AD'
  ),
  53.4808,
  -2.2426,
  '["0161 234 5678"]'::jsonb,
  '["hello@greenearthcafe.co.uk"]'::jsonb,
  'https://greenearthcafe.co.uk',
  ARRAY['Food & Beverage', 'Retail', 'Restaurant'],
  4.6,
  false,
  'ChIJ2345678901'
),
(
  'DataDrive Analytics',
  'Business intelligence and data analytics solutions for enterprise clients. Specializing in predictive analytics and ML.',
  jsonb_build_object(
    'street', '789 Data Lane',
    'city', 'Edinburgh',
    'state', 'Scotland',
    'country', 'United Kingdom',
    'postal_code', 'EH1 1AA'
  ),
  55.9533,
  -3.1883,
  '["0131 234 5678", "0131 234 5680"]'::jsonb,
  '["contact@datadrive.co.uk", "sales@datadrive.co.uk"]'::jsonb,
  'https://datadrive.co.uk',
  ARRAY['Technology', 'Professional Services', 'Analytics'],
  4.9,
  true,
  'ChIJ3456789012'
),
(
  'Swift Logistics Ltd',
  'Comprehensive logistics and supply chain management services across the UK and Ireland. Same-day delivery available.',
  jsonb_build_object(
    'street', '321 Transport Way',
    'city', 'Birmingham',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'B1 1AA'
  ),
  52.4862,
  -1.8904,
  '["0121 234 5678"]'::jsonb,
  '["info@swiftlogistics.co.uk"]'::jsonb,
  'https://swiftlogistics.co.uk',
  ARRAY['Transportation', 'Logistics', 'Professional Services'],
  4.4,
  true,
  'ChIJ4567890123'
),
(
  'Innovate Finance Group',
  'Financial services and investment advisory for businesses and individuals. FCA regulated.',
  jsonb_build_object(
    'street', '999 Money Street',
    'city', 'Dublin',
    'state', 'Dublin',
    'country', 'Ireland',
    'postal_code', 'D01 F5P2'
  ),
  53.3498,
  -6.2603,
  '["+353 1 234 5678"]'::jsonb,
  '["invest@innovatefinance.ie"]'::jsonb,
  'https://innovatefinance.ie',
  ARRAY['Finance', 'Professional Services', 'Investment'],
  4.7,
  true,
  'ChIJ5678901234'
),
(
  'Blue Ocean Marketing',
  'Digital marketing agency specializing in SEO, PPC, and social media marketing for SMEs.',
  jsonb_build_object(
    'street', '42 Creative Quarter',
    'city', 'Bristol',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'BS1 4QD'
  ),
  51.4545,
  -2.5879,
  '["0117 234 5678"]'::jsonb,
  '["hello@blueocean.co.uk"]'::jsonb,
  'https://blueoceanmarketing.co.uk',
  ARRAY['Marketing', 'Technology', 'Professional Services'],
  4.5,
  true,
  'ChIJ6789012345'
),
(
  'HealthFirst Medical Center',
  'Private healthcare facility offering general practice, specialist consultations, and diagnostic services.',
  jsonb_build_object(
    'street', '15 Medical Plaza',
    'city', 'Leeds',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'LS1 2HQ'
  ),
  53.8008,
  -1.5491,
  '["0113 234 5678", "0113 234 5679"]'::jsonb,
  '["appointments@healthfirst.co.uk"]'::jsonb,
  'https://healthfirstmedical.co.uk',
  ARRAY['Healthcare', 'Medical', 'Professional Services'],
  4.7,
  true,
  'ChIJ7890123456'
),
(
  'EcoBuild Construction',
  'Sustainable construction company specializing in green buildings and renewable energy installations.',
  jsonb_build_object(
    'street', '88 Builder Way',
    'city', 'Cardiff',
    'state', 'Wales',
    'country', 'United Kingdom',
    'postal_code', 'CF10 1AA'
  ),
  51.4816,
  -3.1791,
  '["029 2034 5678"]'::jsonb,
  '["info@ecobuild.co.uk"]'::jsonb,
  'https://ecobuildconstruction.co.uk',
  ARRAY['Construction', 'Real Estate', 'Environmental'],
  4.6,
  false,
  'ChIJ8901234567'
),
(
  'Quantum Software Solutions',
  'Custom software development and IT consulting services. Expertise in AI, blockchain, and cloud technologies.',
  jsonb_build_object(
    'street', '200 Innovation Park',
    'city', 'Cambridge',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'CB2 1TN'
  ),
  52.2053,
  0.1218,
  '["01223 234567"]'::jsonb,
  '["contact@quantumsoft.co.uk"]'::jsonb,
  'https://quantumsoftware.co.uk',
  ARRAY['Technology', 'Software', 'Consulting'],
  4.9,
  true,
  'ChIJ9012345678'
),
(
  'Fresh Farm Foods',
  'Organic food distributor connecting local farms with restaurants and retailers across the UK.',
  jsonb_build_object(
    'street', '77 Market Street',
    'city', 'Norwich',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'NR1 3DN'
  ),
  52.6309,
  1.2974,
  '["01603 234567"]'::jsonb,
  '["orders@freshfarmfoods.co.uk"]'::jsonb,
  'https://freshfarmfoods.co.uk',
  ARRAY['Food & Beverage', 'Agriculture', 'Distribution'],
  4.5,
  true,
  'ChIJ0123456789'
),
(
  'SecureNet Cybersecurity',
  'Cybersecurity consulting and managed security services for businesses of all sizes.',
  jsonb_build_object(
    'street', '10 Security Tower',
    'city', 'Glasgow',
    'state', 'Scotland',
    'country', 'United Kingdom',
    'postal_code', 'G1 1XQ'
  ),
  55.8642,
  -4.2518,
  '["0141 234 5678"]'::jsonb,
  '["security@securenet.co.uk"]'::jsonb,
  'https://securenetcyber.co.uk',
  ARRAY['Technology', 'Security', 'Professional Services'],
  4.8,
  true,
  'ChIJ1234567890a'
),
(
  'Elite Education Academy',
  'Private tutoring and educational services for students from primary to university level.',
  jsonb_build_object(
    'street', '25 Academy Road',
    'city', 'Oxford',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'OX1 2JD'
  ),
  51.7520,
  -1.2577,
  '["01865 234567"]'::jsonb,
  '["info@eliteeducation.co.uk"]'::jsonb,
  'https://eliteeducationacademy.co.uk',
  ARRAY['Education', 'Training', 'Professional Services'],
  4.7,
  false,
  'ChIJ2345678901b'
),
(
  'Urban Properties Ltd',
  'Commercial and residential property management and real estate services.',
  jsonb_build_object(
    'street', '300 Property Plaza',
    'city', 'Liverpool',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'L1 1JD'
  ),
  53.4084,
  -2.9916,
  '["0151 234 5678"]'::jsonb,
  '["enquiries@urbanproperties.co.uk"]'::jsonb,
  'https://urbanproperties.co.uk',
  ARRAY['Real Estate', 'Property Management', 'Professional Services'],
  4.3,
  true,
  'ChIJ3456789012c'
),
(
  'CleanTech Energy Solutions',
  'Renewable energy installations and consulting. Solar, wind, and battery storage systems.',
  jsonb_build_object(
    'street', '50 Green Lane',
    'city', 'Brighton',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'BN1 1AA'
  ),
  50.8225,
  -0.1372,
  '["01273 234567"]'::jsonb,
  '["info@cleantech.co.uk"]'::jsonb,
  'https://cleantechenergy.co.uk',
  ARRAY['Energy', 'Environmental', 'Technology'],
  4.6,
  true,
  'ChIJ4567890123d'
),
(
  'Gourmet Kitchen Supplies',
  'Professional kitchen equipment and supplies for restaurants and catering businesses.',
  jsonb_build_object(
    'street', '180 Catering Park',
    'city', 'Sheffield',
    'state', 'England',
    'country', 'United Kingdom',
    'postal_code', 'S1 2BJ'
  ),
  53.3811,
  -1.4701,
  '["0114 234 5678"]'::jsonb,
  '["sales@gourmetkitchen.co.uk"]'::jsonb,
  'https://gourmetkitchensupplies.co.uk',
  ARRAY['Retail', 'Food & Beverage', 'Equipment'],
  4.4,
  false,
  'ChIJ5678901234e'
)
ON CONFLICT (google_place_id) DO UPDATE SET
  updated_at = NOW();

-- Update search vectors for all inserted records
UPDATE businesses 
SET search_vector = generate_search_vector(name, description, categories, address)
WHERE search_vector IS NULL;

-- Refresh materialized view if it exists
REFRESH MATERIALIZED VIEW IF EXISTS business_search_view;