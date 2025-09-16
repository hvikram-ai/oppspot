// Mock company data for demo mode
export const mockCompanies = {
  'mock-1': {
    id: 'mock-1',
    company_number: '03977902',
    name: 'GOOGLE UK LIMITED',
    company_status: 'active',
    company_type: 'ltd',
    incorporation_date: '2000-02-15',
    description: 'Google UK Limited is the UK subsidiary of Alphabet Inc., providing internet-related services and products including online advertising technologies, search engine, cloud computing, software, and hardware.',
    registered_office_address: {
      address_line_1: '1-13 St Giles High St',
      address_line_2: 'Covent Garden',
      locality: 'London',
      postal_code: 'WC2H 8AG',
      country: 'United Kingdom'
    },
    address: {
      formatted: '1-13 St Giles High St, Covent Garden, London, WC2H 8AG, United Kingdom',
      street: '1-13 St Giles High St',
      city: 'London',
      postal_code: 'WC2H 8AG',
      country: 'United Kingdom',
      lat: 51.5155,
      lng: -0.1280
    },
    sic_codes: ['62012', '62020', '73110'],
    categories: ['Technology', 'Software', 'Internet Services'],
    website: 'https://www.google.co.uk',
    phone: '+44 20 7031 3000',
    email: 'press-uk@google.com',
    employee_count: '4000-5000',
    annual_revenue: '£2.4B',
    social_links: {
      linkedin: 'https://www.linkedin.com/company/google',
      twitter: 'https://twitter.com/Google',
      facebook: 'https://www.facebook.com/Google',
      instagram: 'https://www.instagram.com/google'
    },
    metadata: {
      last_updated: new Date().toISOString(),
      source: 'demo',
      linkedin: {
        followers: 25000000,
        employees: 190000,
        industry: 'Technology, Information and Internet'
      }
    },
    slug: 'google-uk-limited',
    verified_at: '2024-01-15T00:00:00Z',
    companies_house_last_updated: new Date().toISOString(),
    cache_expires_at: new Date(Date.now() + 86400000).toISOString()
  },
  'mock-2': {
    id: 'mock-2',
    company_number: '04035903',
    name: 'AMAZON UK SERVICES LTD.',
    company_status: 'active',
    company_type: 'ltd',
    incorporation_date: '2000-08-02',
    description: 'Amazon UK Services Ltd. operates as the UK arm of Amazon.com, Inc., providing e-commerce, cloud computing, digital streaming, and artificial intelligence services.',
    registered_office_address: {
      address_line_1: '1 Principal Place',
      address_line_2: 'Worship Street',
      locality: 'London',
      postal_code: 'EC2A 2FA',
      country: 'United Kingdom'
    },
    address: {
      formatted: '1 Principal Place, Worship Street, London, EC2A 2FA, United Kingdom',
      street: '1 Principal Place',
      city: 'London',
      postal_code: 'EC2A 2FA',
      country: 'United Kingdom',
      lat: 51.5195,
      lng: -0.0798
    },
    sic_codes: ['47911', '52290', '63110'],
    categories: ['E-commerce', 'Technology', 'Retail'],
    website: 'https://www.amazon.co.uk',
    phone: '+44 20 3680 0000',
    email: 'uk-press@amazon.com',
    employee_count: '75000+',
    annual_revenue: '£23.5B',
    social_links: {
      linkedin: 'https://www.linkedin.com/company/amazon',
      twitter: 'https://twitter.com/amazonuk',
      facebook: 'https://www.facebook.com/AmazonUK',
      instagram: 'https://www.instagram.com/amazonuk'
    },
    metadata: {
      last_updated: new Date().toISOString(),
      source: 'demo',
      linkedin: {
        followers: 30000000,
        employees: 1500000,
        industry: 'Internet'
      }
    },
    slug: 'amazon-uk-services-ltd',
    verified_at: '2024-01-15T00:00:00Z',
    companies_house_last_updated: new Date().toISOString(),
    cache_expires_at: new Date(Date.now() + 86400000).toISOString()
  },
  'mock-3': {
    id: 'mock-3',
    company_number: '03824658',
    name: 'MICROSOFT LIMITED',
    company_status: 'active',
    company_type: 'ltd',
    incorporation_date: '1999-08-25',
    description: 'Microsoft Limited is the UK subsidiary of Microsoft Corporation, developing, manufacturing, licensing, supporting and selling computer software, consumer electronics, and personal computers.',
    registered_office_address: {
      address_line_1: 'Microsoft Campus',
      address_line_2: 'Thames Valley Park',
      locality: 'Reading',
      postal_code: 'RG6 1WG',
      country: 'United Kingdom'
    },
    address: {
      formatted: 'Microsoft Campus, Thames Valley Park, Reading, RG6 1WG, United Kingdom',
      street: 'Microsoft Campus, Thames Valley Park',
      city: 'Reading',
      postal_code: 'RG6 1WG',
      country: 'United Kingdom',
      lat: 51.4611,
      lng: -0.9260
    },
    sic_codes: ['62012', '62020', '58290'],
    categories: ['Technology', 'Software', 'Cloud Computing'],
    website: 'https://www.microsoft.com/en-gb',
    phone: '+44 344 800 2400',
    email: 'ukpress@microsoft.com',
    employee_count: '5000+',
    annual_revenue: '£3.2B',
    social_links: {
      linkedin: 'https://www.linkedin.com/company/microsoft',
      twitter: 'https://twitter.com/MicrosoftUK',
      facebook: 'https://www.facebook.com/MicrosoftUK',
      instagram: 'https://www.instagram.com/microsoft'
    },
    metadata: {
      last_updated: new Date().toISOString(),
      source: 'demo',
      linkedin: {
        followers: 20000000,
        employees: 220000,
        industry: 'Software Development'
      }
    },
    slug: 'microsoft-limited',
    verified_at: '2024-01-15T00:00:00Z',
    companies_house_last_updated: new Date().toISOString(),
    cache_expires_at: new Date(Date.now() + 86400000).toISOString()
  },
  'mock-4': {
    id: 'mock-4',
    company_number: '02627406',
    name: 'APPLE UK LIMITED',
    company_status: 'active',
    company_type: 'ltd',
    incorporation_date: '1991-05-16',
    description: 'Apple UK Limited operates as the UK subsidiary of Apple Inc., designing, manufacturing, and marketing mobile communication and media devices, personal computers, and portable digital music players.',
    registered_office_address: {
      address_line_1: '100 New Bridge Street',
      locality: 'London',
      postal_code: 'EC4V 6JA',
      country: 'United Kingdom'
    },
    address: {
      formatted: '100 New Bridge Street, London, EC4V 6JA, United Kingdom',
      street: '100 New Bridge Street',
      city: 'London',
      postal_code: 'EC4V 6JA',
      country: 'United Kingdom',
      lat: 51.5124,
      lng: -0.1035
    },
    sic_codes: ['46510', '47410'],
    categories: ['Technology', 'Consumer Electronics', 'Retail'],
    website: 'https://www.apple.com/uk',
    phone: '+44 20 7660 6000',
    email: 'press.uk@apple.com',
    employee_count: '6000+',
    annual_revenue: '£1.5B',
    social_links: {
      linkedin: 'https://www.linkedin.com/company/apple',
      twitter: 'https://twitter.com/AppleUK',
      facebook: 'https://www.facebook.com/apple',
      instagram: 'https://www.instagram.com/apple'
    },
    metadata: {
      last_updated: new Date().toISOString(),
      source: 'demo',
      linkedin: {
        followers: 18000000,
        employees: 164000,
        industry: 'Computers and Electronics Manufacturing'
      }
    },
    slug: 'apple-uk-limited',
    verified_at: '2024-01-15T00:00:00Z',
    companies_house_last_updated: new Date().toISOString(),
    cache_expires_at: new Date(Date.now() + 86400000).toISOString()
  },
  'mock-5': {
    id: 'mock-5',
    company_number: '03609101',
    name: 'META PLATFORMS IRELAND LIMITED',
    company_status: 'active',
    company_type: 'ltd',
    incorporation_date: '1998-10-13',
    description: 'Meta Platforms Ireland Limited (formerly Facebook) is the European headquarters for Meta, operating social media and messaging services including Facebook, Instagram, and WhatsApp.',
    registered_office_address: {
      address_line_1: '10 Brock Street',
      locality: 'London',
      postal_code: 'NW1 3FG',
      country: 'United Kingdom'
    },
    address: {
      formatted: '10 Brock Street, London, NW1 3FG, United Kingdom',
      street: '10 Brock Street',
      city: 'London',
      postal_code: 'NW1 3FG',
      country: 'United Kingdom',
      lat: 51.5350,
      lng: -0.1385
    },
    sic_codes: ['63120', '73110'],
    categories: ['Technology', 'Social Media', 'Internet Services'],
    website: 'https://about.meta.com',
    phone: '+44 20 3734 2700',
    email: 'press@meta.com',
    employee_count: '3000+',
    annual_revenue: '£2.8B',
    social_links: {
      linkedin: 'https://www.linkedin.com/company/meta',
      twitter: 'https://twitter.com/Meta',
      facebook: 'https://www.facebook.com/Meta',
      instagram: 'https://www.instagram.com/meta'
    },
    metadata: {
      last_updated: new Date().toISOString(),
      source: 'demo',
      linkedin: {
        followers: 7000000,
        employees: 86000,
        industry: 'Technology, Information and Internet'
      }
    },
    slug: 'meta-platforms-ireland-limited',
    verified_at: '2024-01-15T00:00:00Z',
    companies_house_last_updated: new Date().toISOString(),
    cache_expires_at: new Date(Date.now() + 86400000).toISOString()
  }
}

export function getMockCompany(id: string) {
  return mockCompanies[id as keyof typeof mockCompanies] || null
}

export function getMockRelatedCompanies(currentId: string, limit = 6) {
  return Object.values(mockCompanies)
    .filter(company => company.id !== currentId)
    .slice(0, limit)
}