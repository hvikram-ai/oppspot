import { NextRequest, NextResponse } from 'next/server'

// Enable streaming
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Enhanced AI response system with better question matching
const getAIResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase().trim()
  
  // Remove common words for better matching
  const keywords = lowerMessage
    .replace(/\b(the|a|an|is|are|what|how|can|you|i|me|my|do|does|tell|about|more|please|thanks|thank)\b/g, '')
    .trim()
  
  // Check for specific questions about LLM/AI
  if (keywords.includes('llm') || keywords.includes('model') || keywords.includes('ai') || lowerMessage.includes('what llm')) {
    return "I'm currently using a rule-based response system for reliability. We're working on integrating advanced LLMs like Mistral and LLaMA through Ollama for more intelligent conversations. This will enable me to:\n\n• Provide more contextual responses\n• Answer complex business questions\n• Perform deeper analysis\n• Learn from our conversations\n\nFor now, I can help you navigate OppSpot's features effectively!"
  }
  
  // Specific greetings (only for simple greetings)
  if (lowerMessage === 'hi' || lowerMessage === 'hello' || lowerMessage === 'hey') {
    return "Hello! I'm your OppSpot AI assistant. I can help you with business intelligence, M&A analysis, and navigating the platform. What would you like to know?"
  }
  
  // Help requests (more specific)
  if (lowerMessage === 'help' || lowerMessage === 'what can you do' || lowerMessage === 'help me') {
    return "I can help you with:\n\n• **Finding and analyzing companies** - Search our database of UK & Ireland businesses\n• **Similarity analysis** - Find companies similar to your target using AI\n• **M&A opportunities** - Discover potential acquisition targets with OppScan\n• **Platform navigation** - Guide you through OppSpot's features\n• **Business intelligence** - Answer questions about markets and companies\n\nWhat would you like to explore?"
  }
  
  // Feature-specific responses
  if (keywords.includes('similarity') || keywords.includes('similar') || keywords.includes('analyze similar')) {
    return "The **Similarity Analysis** feature uses AI to find companies similar to your target based on multiple dimensions:\n\n• **Financial metrics** - Revenue, growth, profitability\n• **Strategic positioning** - Market position, competitive advantages\n• **Operational characteristics** - Business model, operations\n• **Market factors** - Industry trends, market dynamics\n• **Risk profiles** - Business risks, market risks\n\nTo use it:\n1. Go to any company profile\n2. Click 'Find Similar Companies'\n3. Adjust the similarity parameters\n4. View ranked results with match scores\n\nWould you like to try it with a specific company?"
  }
  
  if (keywords.includes('oppscan') || keywords.includes('opp scan') || (keywords.includes('scan') && !keywords.includes('similarity'))) {
    return "**OppScan** is our comprehensive M&A opportunity scanner that:\n\n• **Multi-source search** - Scans Companies House, web data, and proprietary databases\n• **Smart filtering** - Industry, size, location, financial criteria\n• **AI analysis** - Evaluates strategic fit and opportunity quality\n• **Real-time alerts** - Notifies you of new opportunities\n• **Detailed reports** - Complete intelligence on each target\n\nTo start a scan:\n1. Click 'New Scan' from the dashboard\n2. Set your search criteria\n3. Review and refine results\n4. Export or save promising targets\n\nWhat criteria are important for your search?"
  }
  
  if (keywords.includes('dashboard') || keywords.includes('home')) {
    return "The **Dashboard** is your command center featuring:\n\n• **Quick Search** - Instant company lookup\n• **Recent Activity** - Your searches and analyses\n• **Saved Companies** - Your watchlist and favorites\n• **Active Scans** - Running OppScans and their status\n• **Insights Feed** - Market trends and opportunities\n• **Quick Actions** - Start new scans or analyses\n\nYou can customize widget layouts and set up alerts for specific criteria. The dashboard updates in real-time as new data becomes available."
  }
  
  // Company search queries
  if (keywords.includes('find') || keywords.includes('search') || keywords.includes('looking') || keywords.includes('company') || keywords.includes('companies')) {
    if (keywords.includes('tech') || keywords.includes('technology')) {
      return "To find technology companies:\n\n1. **Use Quick Search** - Type company names or keywords\n2. **Industry Filter** - Select 'Technology' or specific sub-sectors\n3. **Advanced Filters**:\n   • SIC codes: 62 (Computer programming), 63 (Information services)\n   • Employee count: Set your preferred range\n   • Location: Filter by region or city\n   • Financial metrics: Revenue, growth rate\n\nYou can also use OppScan with 'Technology' sector selected for comprehensive results. What specific tech segment interests you?"
    }
    
    return "I can help you find companies! Here are your options:\n\n**Quick Search** - Enter company name or keywords\n**OppScan** - Set detailed criteria for comprehensive search\n**Similarity Analysis** - Find companies like one you know\n\n**Search tips**:\n• Use industry codes (SIC/NACE) for precision\n• Combine filters: location + size + industry\n• Save searches for monitoring\n• Export results for analysis\n\nWhat type of company are you looking for?"
  }
  
  // Data and coverage
  if (keywords.includes('data') || keywords.includes('database') || keywords.includes('coverage') || keywords.includes('source')) {
    return "OppSpot's comprehensive data coverage includes:\n\n**UK & Ireland Companies**:\n• 4.5M+ active companies\n• Companies House direct feed\n• Irish Companies Registration Office\n• Real-time updates\n\n**Data Points**:\n• Financials (filed & estimated)\n• Directors & ownership\n• Contact information\n• Industry classification\n• Credit ratings\n• News & events\n\n**Sources**:\n• Official registries\n• Web scraping & AI extraction\n• Partner data feeds\n• User contributions\n\nUpdated daily with 10,000+ changes tracked."
  }
  
  // Pricing and accounts
  if (keywords.includes('price') || keywords.includes('pricing') || keywords.includes('cost') || keywords.includes('premium') || keywords.includes('upgrade')) {
    return "**OppSpot Pricing Tiers**:\n\n🆓 **Free**\n• 10 searches/month\n• Basic company profiles\n• Limited export (25 records)\n\n⭐ **Premium** (£99/month)\n• Unlimited searches\n• Full financial data\n• Similarity analysis\n• OppScan (100 scans/month)\n• API access (1000 calls/day)\n• Export unlimited\n\n🏢 **Enterprise** (Custom)\n• Everything in Premium\n• Dedicated support\n• Custom integrations\n• Team collaboration\n• Advanced API limits\n\nUpgrade at any time from Account Settings. Need a trial? Contact sales@oppspot.com"
  }
  
  // How-to questions
  if (lowerMessage.includes('how do i') || lowerMessage.includes('how to') || lowerMessage.includes('how can i')) {
    if (keywords.includes('export')) {
      return "**Exporting Data from OppSpot**:\n\n1. **From Search Results**:\n   • Select companies (checkbox)\n   • Click 'Export Selected'\n   • Choose format: CSV, Excel, JSON\n\n2. **From Company Profile**:\n   • Click 'Export' button\n   • Select data sections\n   • Download comprehensive report\n\n3. **From OppScan**:\n   • Go to scan results\n   • Click 'Export All' or select specific\n   • Includes scoring and analysis\n\n**Limits**: Free (25), Premium (Unlimited)\n**Formats**: CSV, XLSX, JSON, PDF"
    }
    
    if (keywords.includes('save') || keywords.includes('bookmark')) {
      return "**Saving Companies in OppSpot**:\n\n1. **Quick Save**: Click the bookmark icon on any company card\n2. **From Profile**: Click 'Save Company' button\n3. **Bulk Save**: Select multiple → 'Save Selected'\n\n**Organize Saved Companies**:\n• Create custom lists (e.g., 'Acquisition Targets')\n• Add notes and tags\n• Set monitoring alerts\n• Share lists with team members\n\nAccess saved companies from Dashboard → 'Saved Companies' or the bookmark icon in the header."
    }
    
    return "I can guide you through OppSpot's features! What would you like to learn how to do?\n\n• Search for companies\n• Run similarity analysis\n• Set up OppScans\n• Export data\n• Save and organize companies\n• Set up alerts\n• Use advanced filters\n\nJust ask about the specific task you need help with!"
  }
  
  // Features and capabilities
  if (keywords.includes('feature') || keywords.includes('capability') || keywords.includes('function')) {
    return "**OppSpot Key Features**:\n\n🔍 **Search & Discovery**\n• Instant company search\n• Advanced filtering\n• Bulk search capabilities\n\n🤖 **AI-Powered Analysis**\n• Similarity matching\n• Market intelligence\n• Risk assessment\n• Growth predictions\n\n📊 **Data & Insights**\n• Financial analysis\n• Competitor tracking\n• Industry trends\n• Market sizing\n\n🎯 **M&A Tools**\n• OppScan for opportunities\n• Valuation estimates\n• Due diligence support\n• Deal flow management\n\nWhich feature would you like to explore?"
  }
  
  // API questions
  if (keywords.includes('api') || keywords.includes('integration') || keywords.includes('webhook')) {
    return "**OppSpot API & Integrations**:\n\n📡 **REST API**\n• Full data access\n• Search endpoints\n• Bulk operations\n• Webhook support\n\n**Endpoints**:\n• `/companies/search` - Search companies\n• `/companies/{id}` - Get company details\n• `/similarity/analyze` - Run similarity analysis\n• `/oppscans/create` - Create new scans\n\n**Authentication**: API key (Bearer token)\n**Rate Limits**: Free (100/day), Premium (1000/day), Enterprise (custom)\n**Formats**: JSON, CSV\n\n**Integrations**:\n• Salesforce\n• HubSpot\n• Microsoft Dynamics\n• Custom via Zapier\n\nDocs: api.oppspot.com/docs"
  }
  
  // Industry-specific queries
  if (keywords.includes('industry') || keywords.includes('sector') || keywords.includes('vertical')) {
    return "**Industry Coverage & Analysis**:\n\nWe cover all UK SIC codes and Irish NACE codes:\n\n**Major Sectors**:\n• Technology & Software\n• Financial Services\n• Healthcare & Life Sciences\n• Manufacturing & Industrial\n• Retail & E-commerce\n• Professional Services\n• Energy & Utilities\n• Real Estate\n• Construction\n• Hospitality & Leisure\n\n**Industry Features**:\n• Sector-specific metrics\n• Industry trends analysis\n• Peer benchmarking\n• Market sizing\n• Growth forecasts\n\nWhich industry are you interested in analyzing?"
  }
  
  // Support and contact
  if (keywords.includes('support') || keywords.includes('contact') || keywords.includes('issue') || keywords.includes('problem')) {
    return "**Getting Help with OppSpot**:\n\n📧 **Contact Support**:\n• Email: support@oppspot.com\n• Live chat: Bottom-right corner (business hours)\n• Response time: <2 hours (Premium), <24 hours (Free)\n\n📚 **Resources**:\n• Help Center: help.oppspot.com\n• Video tutorials: oppspot.com/tutorials\n• API docs: api.oppspot.com/docs\n• Status page: status.oppspot.com\n\n🐛 **Report Issues**:\n• Use feedback button in app\n• Include screenshot if possible\n• Describe steps to reproduce\n\nNeed immediate help? Describe your issue and I'll try to assist!"
  }
  
  // Questions about specific companies (examples)
  if (lowerMessage.includes('apple') || lowerMessage.includes('microsoft') || lowerMessage.includes('google')) {
    return "To find information about specific companies like that:\n\n1. **Use Quick Search** - Type the company name\n2. **View Full Profile** - Click on the company card\n3. **Available Data**:\n   • Company overview and description\n   • Financial statements and metrics\n   • Directors and ownership\n   • Similar companies\n   • Recent news and events\n\n**Note**: We focus on UK & Ireland companies. For international giants, we may have their UK subsidiaries.\n\nWould you like to search for UK operations of major tech companies?"
  }
  
  // Default response - but make it more contextual
  if (keywords.includes('thanks') || keywords.includes('thank you') || keywords.includes('ok') || keywords.includes('okay')) {
    return "You're welcome! Is there anything else you'd like to know about OppSpot's features or how to find business opportunities?"
  }
  
  // More contextual default based on keywords
  if (keywords.length > 0) {
    return `I understand you're asking about "${message}". Let me help you with that:\n\n• If you're looking for companies, try using the Search feature or OppScan\n• For analysis tools, check out Similarity Analysis in any company profile\n• For platform features, explore the Dashboard and its various sections\n\nCould you provide more details about what you're trying to accomplish? For example:\n• Are you searching for specific companies?\n• Do you need help with a particular feature?\n• Are you looking for market intelligence?\n\nI'm here to help guide you through OppSpot!`
  }
  
  // Final fallback
  return "I'm here to help you navigate OppSpot effectively. Could you rephrase your question or tell me more about what you're trying to do? For example:\n\n• 'How do I find tech companies in London?'\n• 'What is similarity analysis?'\n• 'How does OppScan work?'\n• 'What data do you have on UK companies?'\n\nI can provide specific guidance once I understand your needs better!"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, session_id, context } = body
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    // Generate session ID if not provided
    const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Get AI response
    const aiResponse = getAIResponse(message)
    
    // Check if streaming is requested
    const stream = request.headers.get('accept') === 'text/event-stream'
    
    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        start(controller) {
          // Send the response in chunks to simulate streaming
          const words = aiResponse.split(' ')
          let index = 0
          
          const interval = setInterval(() => {
            if (index < words.length) {
              const chunk = words[index] + ' '
              const data = `data: ${JSON.stringify({
                type: 'text',
                content: chunk,
                timestamp: new Date()
              })}\n\n`
              controller.enqueue(encoder.encode(data))
              index++
            } else {
              // Send final message
              const data = `data: ${JSON.stringify({
                type: 'done',
                content: aiResponse,
                confidence: 0.85
              })}\n\n`
              controller.enqueue(encoder.encode(data))
              clearInterval(interval)
              controller.close()
            }
          }, 30) // Send a word every 30ms for smoother streaming
        }
      })
      
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Regular JSON response
      return NextResponse.json({
        session_id: sessionId,
        message: {
          role: 'assistant',
          content: aiResponse,
          confidence: 0.85,
          timestamp: new Date().toISOString()
        }
      })
    }
  } catch (error) {
    console.error('[AI Chat API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat processing failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // For now, return empty history
    return NextResponse.json({ 
      sessions: [],
      messages: [] 
    })
  } catch (error) {
    console.error('[AI Chat API] Error fetching history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}