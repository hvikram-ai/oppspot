/**
 * OppSpot Knowledge Base for AI Assistant
 * Comprehensive Q&A pairs and feature documentation
 */

export interface QAPair {
  patterns: string[]
  response: string
  category: string
  confidence: number
}

export const knowledgeBase: QAPair[] = [
  // Greetings
  {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    response: "Hello! I'm your OppSpot AI assistant. I can help you find UK & Ireland companies, analyze M&A opportunities, and navigate our platform features. What would you like to explore today?",
    category: 'greeting',
    confidence: 1.0
  },
  
  // Platform Overview
  {
    patterns: ['what is oppspot', 'tell me about oppspot', 'platform overview'],
    response: "OppSpot is a comprehensive business intelligence platform for UK & Ireland companies. We offer:\n\n• **Company Database**: 4.5M+ businesses with real-time data\n• **OppScan**: AI-powered M&A opportunity scanner\n• **Similarity Analysis**: Find companies similar to your target\n• **Financial Intelligence**: Revenue estimates, growth metrics, ownership data\n• **API Access**: Integrate our data into your workflows\n\nWhat specific feature would you like to explore?",
    category: 'overview',
    confidence: 1.0
  },
  
  // Company Search
  {
    patterns: ['find companies', 'search companies', 'how to search', 'find business'],
    response: "To search for companies in OppSpot:\n\n**Quick Search** (fastest):\n• Type company name in the search bar\n• Use keywords like 'software London' or 'manufacturing Manchester'\n\n**Advanced Search**:\n• Click 'Advanced' next to search\n• Filter by: Industry (SIC codes), Location, Size, Revenue, Founded date\n• Combine multiple criteria\n\n**Pro tip**: Save your searches to monitor new matches. What type of company are you looking for?",
    category: 'search',
    confidence: 1.0
  },
  
  {
    patterns: ['find tech companies', 'technology companies', 'software companies', 'IT companies'],
    response: "To find technology companies:\n\n1. **Quick method**: Search 'technology' or specific terms like 'SaaS', 'AI', 'fintech'\n\n2. **Precise method**:\n   • Go to Advanced Search\n   • Select Industry → Technology\n   • Or use SIC codes: 62 (Computer programming), 63 (Information services)\n   • Add location/size filters as needed\n\n3. **OppScan**: Create a tech-focused scan for continuous monitoring\n\nWant to narrow down by specific tech sector or location?",
    category: 'search',
    confidence: 1.0
  },
  
  // Similarity Analysis
  {
    patterns: ['similarity analysis', 'similar companies', 'find similar', 'companies like'],
    response: "**Similarity Analysis** finds companies similar to your target using AI:\n\n**How it works**:\n• Analyzes 5 dimensions: Financial, Strategic, Operational, Market, Risk\n• Scores companies 0-100% match\n• Shows why companies are similar\n\n**To use it**:\n1. Go to any company profile\n2. Click 'Find Similar Companies' button\n3. Adjust importance weights for each factor\n4. View ranked results with match explanations\n\n**Best for**: Finding acquisition targets, competitors, or partnership opportunities. Have a specific company in mind?",
    category: 'similarity',
    confidence: 1.0
  },
  
  // OppScan
  {
    patterns: ['oppscan', 'opp scan', 'acquisition scanner', 'ma scanner', 'm&a search'],
    response: "**OppScan** is our AI-powered M&A opportunity scanner:\n\n**Features**:\n• Continuously scans for targets matching your criteria\n• Multi-source intelligence gathering\n• AI scoring for strategic fit\n• Real-time alerts for new opportunities\n\n**To create a scan**:\n1. Dashboard → 'New OppScan'\n2. Set your criteria:\n   • Industry & keywords\n   • Financial thresholds\n   • Geographic preferences\n   • Strategic factors\n3. Review AI-scored results\n4. Export or save promising targets\n\n**Tip**: Run multiple scans for different acquisition strategies. What's your target profile?",
    category: 'oppscan',
    confidence: 1.0
  },
  
  // Data & Coverage
  {
    patterns: ['what data', 'data coverage', 'data sources', 'information available'],
    response: "OppSpot provides comprehensive business data:\n\n**Coverage**: 4.5M+ UK & Ireland companies\n\n**Data points include**:\n• Company details (name, address, incorporation)\n• Financials (revenue, profit, assets, growth)\n• Ownership & shareholders\n• Directors & key personnel\n• Industry classification (SIC/NACE)\n• Credit ratings & risk scores\n• News & events\n• Contact information\n\n**Sources**: Companies House, CRO Ireland, web intelligence, proprietary analysis\n\n**Updates**: Real-time feed with 10,000+ daily changes\n\nNeed specific data points explained?",
    category: 'data',
    confidence: 1.0
  },
  
  // Pricing
  {
    patterns: ['pricing', 'cost', 'price', 'subscription', 'plans', 'upgrade'],
    response: "**OppSpot Pricing Plans**:\n\n**Free Tier**:\n• 10 searches/month\n• Basic company profiles\n• Limited to 25 exports\n\n**Premium (£99/month)**:\n• Unlimited searches\n• Full financial data & estimates\n• Similarity Analysis\n• 100 OppScans/month\n• API access (1,000 calls/day)\n• Unlimited exports\n• Email support\n\n**Enterprise (Custom)**:\n• Everything in Premium\n• Unlimited OppScans\n• Custom API limits\n• Dedicated account manager\n• Team collaboration\n• SSO integration\n\nUpgrade anytime from Account Settings. Need help choosing a plan?",
    category: 'pricing',
    confidence: 1.0
  },
  
  // How-to Questions
  {
    patterns: ['export data', 'download data', 'export companies', 'save results'],
    response: "**Exporting data from OppSpot**:\n\n**From search results**:\n1. Select companies (checkbox)\n2. Click 'Export Selected' button\n3. Choose format: CSV, Excel, or JSON\n\n**From company profile**:\n• Click 'Export' → Select sections → Download\n\n**From OppScan results**:\n• 'Export All' or select specific companies\n\n**Formats available**:\n• CSV - for spreadsheets\n• Excel - with formatting\n• JSON - for developers\n• PDF - for reports (Premium)\n\n**Limits**: Free (25), Premium (Unlimited)\n\nNeed help with bulk exports?",
    category: 'export',
    confidence: 1.0
  },
  
  {
    patterns: ['save company', 'bookmark', 'watchlist', 'favorites', 'track company'],
    response: "**Saving and tracking companies**:\n\n**Quick save**:\n• Click bookmark icon (⭐) on any company card\n• Access from Dashboard → Saved Companies\n\n**Organize saved companies**:\n1. Create custom lists (e.g., 'Acquisition Targets', 'Competitors')\n2. Add tags and notes\n3. Set monitoring alerts\n4. Share lists with team (Premium)\n\n**Monitoring**:\n• Get alerts for: Financial updates, News, Management changes\n• Weekly digest email of changes\n• Real-time notifications (Premium)\n\nWant to set up monitoring for specific events?",
    category: 'save',
    confidence: 1.0
  },
  
  // API & Integration
  {
    patterns: ['api', 'integration', 'connect', 'webhook', 'automate'],
    response: "**OppSpot API & Integrations**:\n\n**REST API** (Premium/Enterprise):\n• Base URL: `api.oppspot.com/v1`\n• Authentication: Bearer token\n• Rate limits: 1,000/day (Premium), Custom (Enterprise)\n\n**Key endpoints**:\n• `/companies/search` - Search companies\n• `/companies/{id}` - Get company details\n• `/similarity/analyze` - Run similarity analysis\n• `/oppscans` - Manage scans\n\n**Integrations available**:\n• Salesforce - Sync companies\n• HubSpot - Import leads\n• Zapier - 1000+ apps\n• Webhooks - Real-time events\n\nNeed help with a specific integration?",
    category: 'api',
    confidence: 1.0
  },
  
  // Support
  {
    patterns: ['help', 'support', 'contact', 'issue', 'problem', 'not working'],
    response: "**Getting help with OppSpot**:\n\n**Self-service**:\n• Help Center: help.oppspot.com\n• Video tutorials: oppspot.com/tutorials\n• API docs: api.oppspot.com/docs\n\n**Contact support**:\n• Email: support@oppspot.com\n• Live chat: Available 9am-6pm GMT (Premium)\n• Response time: <24h (Free), <2h (Premium)\n\n**Report issues**:\n• Use feedback button (bottom-left)\n• Include screenshots if possible\n• Describe steps to reproduce\n\nWhat specific issue can I help you with?",
    category: 'support',
    confidence: 1.0
  },
  
  // Features
  {
    patterns: ['features', 'capabilities', 'what can oppspot do', 'functionality'],
    response: "**OppSpot Key Features**:\n\n**🔍 Search & Discovery**\n• Instant company search\n• Advanced filtering (50+ criteria)\n• Bulk search (upload lists)\n\n**🤖 AI-Powered Tools**\n• Similarity Analysis - Find lookalike companies\n• OppScan - M&A opportunity scanner\n• Financial estimates - AI-predicted metrics\n• Risk scoring - Automated assessments\n\n**📊 Intelligence & Analytics**\n• Financial analysis & trends\n• Ownership mapping\n• Competitor tracking\n• Market sizing\n\n**🔗 Workflow Tools**\n• CRM integrations\n• API access\n• Export & reporting\n• Team collaboration\n\nWhich feature interests you most?",
    category: 'features',
    confidence: 1.0
  },
  
  // Industries
  {
    patterns: ['industries', 'sectors', 'verticals', 'industry coverage'],
    response: "**Industry Coverage**:\n\nWe cover all UK SIC codes and Irish NACE codes:\n\n**Top sectors**:\n• Technology & Software (SIC 62-63)\n• Financial Services (SIC 64-66)\n• Healthcare & Life Sciences (SIC 86-88)\n• Manufacturing (SIC 10-33)\n• Professional Services (SIC 69-75)\n• Retail & E-commerce (SIC 47)\n• Construction (SIC 41-43)\n• Real Estate (SIC 68)\n\n**Industry features**:\n• Sector-specific filters\n• Industry benchmarking\n• Peer comparison\n• Market trends\n• Growth forecasts\n\nWhich industry are you researching?",
    category: 'industries',
    confidence: 1.0
  },
  
  // Specific company search queries
  {
    patterns: ['london companies', 'companies in london', 'london based'],
    response: "To find companies in London:\n\n**Quick Search**: Type 'London' in the search bar\n\n**Advanced Search**:\n1. Click 'Advanced Search'\n2. Location → Select 'London' or 'Greater London'\n3. Optional: Add industry, size, or revenue filters\n4. Click 'Search'\n\n**Tips**:\n• Use postcodes for specific areas (e.g., 'EC1' for Tech City)\n• Combine with industry: 'fintech London'\n• Save search for monitoring new companies\n\nNeed help finding specific types of London companies?",
    category: 'location_search',
    confidence: 1.0
  },
  
  {
    patterns: ['revenue', 'company revenue', 'financial data', 'turnover'],
    response: "**Revenue & Financial Data in OppSpot**:\n\n**Available metrics**:\n• Annual revenue (actual & estimated)\n• Revenue growth trends\n• Profit margins\n• Assets & liabilities\n• Cash flow indicators\n\n**To filter by revenue**:\n1. Advanced Search → Financial Filters\n2. Set min/max revenue range\n3. Choose currency (GBP/EUR)\n\n**Data sources**:\n• Filed accounts (Companies House/CRO)\n• AI-powered estimates for private companies\n• Industry benchmarking\n\n**Note**: Premium users get full financial history and estimates. What revenue range are you targeting?",
    category: 'financials',
    confidence: 1.0
  },
  
  {
    patterns: ['competitors', 'competitive analysis', 'competitor research'],
    response: "**Finding & Analyzing Competitors**:\n\n**Method 1 - Direct Search**:\n1. Search for your target company\n2. Click 'View Competitors' on profile\n3. See companies in same industry/location\n\n**Method 2 - Similarity Analysis**:\n1. Go to known competitor\n2. Click 'Find Similar Companies'\n3. Adjust similarity weights\n4. Get ranked list of competitors\n\n**Method 3 - Industry Search**:\n• Advanced Search → Same SIC code\n• Filter by location & size\n• Sort by relevance or growth\n\n**Export competitor lists** for tracking. Which company's competitors are you researching?",
    category: 'competitors',
    confidence: 1.0
  },
  
  {
    patterns: ['free trial', 'try oppspot', 'demo', 'test'],
    response: "**Getting Started with OppSpot**:\n\n**Free Tier** includes:\n• 10 searches per month\n• Basic company profiles\n• 25 data exports\n• Access to 4.5M+ companies\n\n**No credit card required** to start!\n\n**To begin**:\n1. Sign up at oppspot.com/signup\n2. Verify your email\n3. Start searching immediately\n\n**Want more features?**\nUpgrade to Premium (£99/month) for:\n• Unlimited searches\n• Full financial data\n• Similarity Analysis\n• OppScan M&A tool\n• API access\n\nReady to explore our platform?",
    category: 'trial',
    confidence: 1.0
  },
  
  // Specific company similarity analysis
  {
    patterns: ['similarity for', 'similar to', 'companies like', 'find similar to', 'patsnap similar'],
    response: "**To run Similarity Analysis for a specific company**:\n\n1. **Search for the company**:\n   • Enter company name in Quick Search\n   • Example: 'Patsnap' or any target company\n\n2. **Open company profile**:\n   • Click on the company from search results\n   • Review their key metrics\n\n3. **Run Similarity Analysis**:\n   • Click 'Find Similar Companies' button\n   • Adjust weights for factors important to you:\n     - Financial similarity (revenue, growth)\n     - Industry alignment\n     - Geographic proximity\n     - Company size\n     - Risk profile\n\n4. **Review results**:\n   • See companies ranked by similarity %\n   • Click 'Why Similar?' for explanations\n   • Export list for further analysis\n\n**Tip**: For IP/patent companies like Patsnap, increase weight on 'Technology' and 'Innovation' factors.\n\nShall I guide you through searching for your target company first?",
    category: 'similarity_specific',
    confidence: 1.0
  }
]

/**
 * Find best matching response from knowledge base
 */
export function findBestMatch(query: string): QAPair | null {
  const lowerQuery = query.toLowerCase()
  let bestMatch: QAPair | null = null
  let bestScore = 0
  
  for (const qa of knowledgeBase) {
    for (const pattern of qa.patterns) {
      // Check if pattern is in query
      if (lowerQuery.includes(pattern)) {
        // Calculate score based on pattern length and position
        const score = pattern.length / lowerQuery.length + (lowerQuery.startsWith(pattern) ? 0.5 : 0)
        
        if (score > bestScore) {
          bestScore = score
          bestMatch = qa
        }
      }
    }
  }
  
  // Return match if score is above threshold
  return bestScore > 0.3 ? bestMatch : null
}

/**
 * Get response for a category
 */
export function getResponseByCategory(category: string): QAPair | null {
  return knowledgeBase.find(qa => qa.category === category) || null
}