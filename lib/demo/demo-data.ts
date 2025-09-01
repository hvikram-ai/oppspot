// Demo data generator for live demo mode
export const demoBusinesses = [
  {
    id: 'demo-1',
    name: 'TechHub Solutions',
    category: 'Technology',
    subcategory: 'Software Development',
    description: 'Leading software development company specializing in custom enterprise solutions and cloud architecture.',
    address: '123 Tech Street, London, EC2A 4BX',
    city: 'London',
    postcode: 'EC2A 4BX',
    phone: '+44 20 7123 4567',
    email: 'contact@techhub-demo.com',
    website: 'https://techhub-demo.com',
    rating: 4.8,
    review_count: 234,
    price_range: '£££',
    coordinates: { lat: 51.5074, lng: -0.1278 },
    metadata: {
      established_year: 2018,
      employee_count: '50-100',
      annual_revenue: '£5M-10M',
      growth_rate: 35,
      market_position: 'leader',
      verified: true,
      claimed_by: 'demo-owner'
    },
    tags: ['B2B', 'Enterprise', 'Cloud', 'AI/ML', 'Consulting'],
    images: ['/api/placeholder/400/300'],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-08-20T15:30:00Z'
  },
  {
    id: 'demo-2',
    name: 'Green Energy Partners',
    category: 'Energy',
    subcategory: 'Renewable Energy',
    description: 'Sustainable energy solutions for commercial and residential properties. Solar, wind, and battery storage systems.',
    address: '45 Eco Plaza, Manchester, M1 5GD',
    city: 'Manchester',
    postcode: 'M1 5GD',
    phone: '+44 161 234 5678',
    email: 'info@greenenergy-demo.com',
    website: 'https://greenenergy-demo.com',
    rating: 4.6,
    review_count: 189,
    price_range: '£££',
    coordinates: { lat: 53.4808, lng: -2.2426 },
    metadata: {
      established_year: 2019,
      employee_count: '25-50',
      annual_revenue: '£2M-5M',
      growth_rate: 42,
      market_position: 'challenger',
      verified: true
    },
    tags: ['Sustainable', 'B2B', 'B2C', 'Installation', 'Consulting'],
    images: ['/api/placeholder/400/300'],
    created_at: '2024-02-10T09:00:00Z',
    updated_at: '2024-08-19T14:20:00Z'
  },
  {
    id: 'demo-3',
    name: 'Digital Marketing Pro',
    category: 'Marketing',
    subcategory: 'Digital Marketing',
    description: 'Full-service digital marketing agency. SEO, PPC, social media, and content marketing expertise.',
    address: '78 Creative Quarter, Birmingham, B1 2NS',
    city: 'Birmingham',
    postcode: 'B1 2NS',
    phone: '+44 121 345 6789',
    email: 'hello@digitalmarketingpro-demo.com',
    website: 'https://digitalmarketingpro-demo.com',
    rating: 4.9,
    review_count: 412,
    price_range: '££',
    coordinates: { lat: 52.4862, lng: -1.8904 },
    metadata: {
      established_year: 2017,
      employee_count: '10-25',
      annual_revenue: '£1M-2M',
      growth_rate: 28,
      market_position: 'niche_leader',
      verified: true
    },
    tags: ['SEO', 'PPC', 'Social Media', 'Content', 'Analytics'],
    images: ['/api/placeholder/400/300'],
    created_at: '2024-01-20T11:00:00Z',
    updated_at: '2024-08-21T10:15:00Z'
  },
  {
    id: 'demo-4',
    name: 'FinTech Innovations Ltd',
    category: 'Finance',
    subcategory: 'Financial Technology',
    description: 'Cutting-edge payment processing and financial automation solutions for modern businesses.',
    address: '200 Canary Wharf, London, E14 5RS',
    city: 'London',
    postcode: 'E14 5RS',
    phone: '+44 20 7987 6543',
    email: 'contact@fintech-demo.com',
    website: 'https://fintech-demo.com',
    rating: 4.7,
    review_count: 156,
    price_range: '££££',
    coordinates: { lat: 51.5055, lng: -0.0195 },
    metadata: {
      established_year: 2020,
      employee_count: '100-250',
      annual_revenue: '£10M-25M',
      growth_rate: 65,
      market_position: 'emerging',
      verified: true
    },
    tags: ['Payments', 'API', 'Blockchain', 'RegTech', 'B2B'],
    images: ['/api/placeholder/400/300'],
    created_at: '2024-03-05T08:30:00Z',
    updated_at: '2024-08-22T16:45:00Z'
  },
  {
    id: 'demo-5',
    name: 'Healthcare Plus',
    category: 'Healthcare',
    subcategory: 'Health Tech',
    description: 'Telemedicine platform and healthcare management solutions for clinics and hospitals.',
    address: '32 Medical Centre, Edinburgh, EH1 2LX',
    city: 'Edinburgh',
    postcode: 'EH1 2LX',
    phone: '+44 131 456 7890',
    email: 'info@healthcareplus-demo.com',
    website: 'https://healthcareplus-demo.com',
    rating: 4.5,
    review_count: 267,
    price_range: '£££',
    coordinates: { lat: 55.9533, lng: -3.1883 },
    metadata: {
      established_year: 2019,
      employee_count: '50-100',
      annual_revenue: '£5M-10M',
      growth_rate: 38,
      market_position: 'specialist',
      verified: true
    },
    tags: ['Telemedicine', 'EMR', 'Healthcare', 'SaaS', 'HIPAA'],
    images: ['/api/placeholder/400/300'],
    created_at: '2024-02-28T10:00:00Z',
    updated_at: '2024-08-20T12:30:00Z'
  },
  {
    id: 'demo-6',
    name: 'Logistics Express',
    category: 'Logistics',
    subcategory: 'Supply Chain',
    description: 'End-to-end supply chain management and last-mile delivery solutions.',
    address: '88 Transport Hub, Leeds, LS1 4DY',
    city: 'Leeds',
    postcode: 'LS1 4DY',
    phone: '+44 113 234 5678',
    email: 'ops@logistics-demo.com',
    website: 'https://logistics-demo.com',
    rating: 4.4,
    review_count: 143,
    price_range: '££',
    coordinates: { lat: 53.8008, lng: -1.5491 },
    metadata: {
      established_year: 2018,
      employee_count: '25-50',
      annual_revenue: '£2M-5M',
      growth_rate: 31,
      market_position: 'growing',
      verified: true
    },
    tags: ['Delivery', 'Warehousing', 'Fleet', 'Tracking', 'B2B'],
    images: ['/api/placeholder/400/300'],
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-08-18T11:20:00Z'
  }
]

export const demoMetrics = {
  totalBusinesses: 1247,
  averageRating: 4.6,
  totalReviews: 15823,
  growthRate: 32,
  categories: [
    { name: 'Technology', count: 342, growth: 45 },
    { name: 'Finance', count: 189, growth: 38 },
    { name: 'Healthcare', count: 156, growth: 42 },
    { name: 'Marketing', count: 234, growth: 28 },
    { name: 'Energy', count: 98, growth: 56 },
    { name: 'Logistics', count: 123, growth: 31 }
  ],
  recentActivity: [
    { type: 'new_business', message: 'AI Startup Ltd joined the platform', time: '2 hours ago' },
    { type: 'review', message: 'TechHub Solutions received a 5-star review', time: '3 hours ago' },
    { type: 'update', message: 'Green Energy Partners updated their services', time: '5 hours ago' },
    { type: 'milestone', message: 'Digital Marketing Pro reached 400+ reviews', time: '1 day ago' }
  ]
}

export const demoOpportunities = [
  {
    id: 'opp-1',
    type: 'underserved_market',
    category: 'Technology',
    title: 'High demand for AI consulting in Manchester',
    description: 'Market analysis shows 78% increase in AI consulting searches with only 12 providers in the area.',
    score: 0.92,
    potential_value: 250000,
    confidence: 0.85,
    time_remaining: '45 days',
    factors: ['Low competition', 'High search volume', 'Growing market', 'Enterprise demand']
  },
  {
    id: 'opp-2',
    type: 'emerging_trend',
    category: 'Healthcare',
    title: 'Mental health tech services gap',
    description: 'Rising demand for digital mental health solutions with 65% YoY growth and limited providers.',
    score: 0.88,
    potential_value: 180000,
    confidence: 0.79,
    time_remaining: '30 days',
    factors: ['Policy changes', 'Increased awareness', 'Insurance coverage', 'Tech adoption']
  },
  {
    id: 'opp-3',
    type: 'competitor_weakness',
    category: 'Finance',
    title: 'Traditional banks losing SME customers',
    description: 'SMEs reporting 43% dissatisfaction with traditional banking services, opportunity for fintech solutions.',
    score: 0.75,
    potential_value: 320000,
    confidence: 0.82,
    time_remaining: '60 days',
    factors: ['Poor service', 'High fees', 'Slow processes', 'Limited features']
  }
]

export const demoTrends = {
  marketTrend: 'rising',
  trendStrength: 0.76,
  volatility: 0.23,
  momentum: 0.68,
  predictions: {
    '7d': { value: 4.7, confidence: 0.92 },
    '30d': { value: 4.8, confidence: 0.85 },
    '90d': { value: 4.9, confidence: 0.71 }
  },
  insights: [
    'Technology sector showing strongest growth at 45% YoY',
    'Increased demand for B2B services across all categories',
    'Sustainability-focused businesses gaining market share',
    'Digital transformation driving service evolution'
  ]
}

export const demoCompetitors = [
  {
    id: 'comp-1',
    name: 'TechHub Solutions',
    category: 'Technology',
    rating: 4.8,
    reviews: 234,
    strengths: ['Enterprise clients', 'Cloud expertise', 'Strong team'],
    weaknesses: ['Limited marketing', 'Higher pricing'],
    market_share: 12.5,
    growth_rate: 35
  },
  {
    id: 'comp-2',
    name: 'Digital Dynamics',
    category: 'Technology',
    rating: 4.5,
    reviews: 178,
    strengths: ['Agile development', 'Competitive pricing'],
    weaknesses: ['Smaller team', 'Limited services'],
    market_share: 8.3,
    growth_rate: 28
  },
  {
    id: 'comp-3',
    name: 'Cloud First Ltd',
    category: 'Technology',
    rating: 4.6,
    reviews: 195,
    strengths: ['AWS partnership', 'DevOps focus'],
    weaknesses: ['Narrow specialization', 'Geographic limits'],
    market_share: 9.7,
    growth_rate: 31
  }
]

export const demoNotifications = [
  {
    id: 'notif-1',
    type: 'opportunity',
    title: 'New opportunity detected',
    message: 'High-value opportunity in Technology sector with 92% match score',
    time: '10 minutes ago',
    read: false,
    priority: 'high'
  },
  {
    id: 'notif-2',
    type: 'competitor',
    title: 'Competitor alert',
    message: 'New competitor entered your market segment',
    time: '2 hours ago',
    read: false,
    priority: 'medium'
  },
  {
    id: 'notif-3',
    type: 'market',
    title: 'Market trend update',
    message: 'Technology sector growth accelerating to 45% YoY',
    time: '5 hours ago',
    read: true,
    priority: 'low'
  }
]

// Function to generate random demo data
export function generateDemoAnalytics(days: number = 30) {
  const data = []
  const now = new Date()
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    data.push({
      date: date.toISOString().split('T')[0],
      businesses: Math.floor(1200 + Math.random() * 100),
      avgRating: 4.5 + Math.random() * 0.3,
      reviews: Math.floor(15000 + Math.random() * 1000),
      growth: 25 + Math.random() * 15,
      newLeads: Math.floor(20 + Math.random() * 30),
      conversions: Math.floor(5 + Math.random() * 10)
    })
  }
  
  return data
}

// Demo user data
export const demoUser = {
  id: 'demo-user',
  email: 'demo@oppspot.com',
  full_name: 'Demo User',
  avatar_url: '/api/placeholder/40/40',
  role: 'viewer',
  company: 'Demo Company Ltd',
  created_at: new Date().toISOString()
}