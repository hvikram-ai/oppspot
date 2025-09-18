# AI-Powered Lead Scoring Setup Guide

## Overview
This guide explains how to configure and activate the AI-powered lead scoring system in oppSpot. The system uses local Ollama LLMs for privacy-focused, intelligent company analysis.

## Prerequisites
- oppSpot application running
- Supabase database configured
- Minimum 8GB RAM for AI models
- ~5GB disk space for model storage

## Setup Instructions

### 1. Install Ollama

#### Linux/macOS
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
```

#### Windows
Download and install from: https://ollama.com/download/windows

#### Docker (Alternative)
```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Enable AI-powered scoring
ENABLE_OLLAMA=true

# Ollama connection settings (adjust if using remote server)
OLLAMA_BASE_URL=http://localhost:11434

# Model selection
OLLAMA_PRIMARY_MODEL=mistral:7b        # For detailed analysis
OLLAMA_FAST_MODEL=tinyllama:1.1b       # For quick scoring

# Optional: Timeout settings (milliseconds)
OLLAMA_TIMEOUT=120000                  # 2 minutes default
```

### 3. Start Ollama Service

```bash
# Start Ollama (runs in background)
ollama serve

# Or run in foreground to see logs
ollama run serve
```

### 4. Download Required Models

Open a new terminal and pull the AI models:

```bash
# Primary model for detailed financial analysis (~4.1GB)
ollama pull mistral:7b

# Fast model for quick scoring (~638MB)
ollama pull tinyllama:1.1b

# Optional: List installed models
ollama list
```

### 5. Run Database Migrations

Apply the AI scoring database schema:

```bash
# Using Supabase CLI
npx supabase migration up

# Or run the SQL directly in Supabase dashboard:
# - Go to SQL Editor
# - Run the migration from: supabase/migrations/20250118_add_ai_scoring_cache.sql
```

### 6. Verify Installation

#### Check Ollama Status
```bash
# Test Ollama is running
curl http://localhost:11434/api/version

# Expected response:
# {"version":"0.1.x"}

# List available models
curl http://localhost:11434/api/tags

# Should show mistral:7b and tinyllama:1.1b
```

#### Test AI Scoring API
```bash
# Check AI scoring availability (requires authentication)
curl http://localhost:3000/api/scoring/ai-analyze \
  -H "Cookie: your-auth-cookie"

# Expected response:
{
  "success": true,
  "ai_scoring": {
    "enabled": true,
    "available": true,
    "status": "ready",
    "models": ["mistral:7b", "tinyllama:1.1b"]
  }
}
```

## Usage

### API Endpoints

#### 1. Calculate Score with AI
```javascript
POST /api/scoring/calculate
{
  "company_number": "03977902",  // Or company_id
  "use_ai": true,                 // Enable AI scoring
  "ai_depth": "detailed",         // "detailed" or "quick"
  "include_explanations": true    // Get natural language insights
}
```

#### 2. Full AI Analysis
```javascript
POST /api/scoring/ai-analyze
{
  "company_id": "uuid-here",
  "analysis_depth": "detailed",      // "detailed" or "quick"
  "include_recommendations": true
}
```

Response includes:
- Component scores (financial, technology, industry, growth, engagement)
- Natural language summary
- AI confidence levels
- Actionable recommendations
- Risk factors and opportunities

### Frontend Integration

The Companies page automatically shows AI scores when enabled:
- AI badge appears when score is AI-generated
- Natural language explanations in tooltips
- Confidence indicators (high/medium/low)

### Using Different Models

```javascript
// Quick analysis with TinyLlama (faster, less detailed)
{
  "use_ai": true,
  "ai_depth": "quick"
}

// Detailed analysis with Mistral (slower, more comprehensive)
{
  "use_ai": true,
  "ai_depth": "detailed"
}
```

## Features

### What AI Scoring Provides

1. **Intelligent Financial Analysis**
   - Contextual understanding of financial metrics
   - Industry-specific benchmarking
   - Risk pattern recognition
   - Predictive insights

2. **Natural Language Insights**
   - Human-readable explanations
   - Executive summaries
   - Actionable recommendations
   - Risk and opportunity identification

3. **Adaptive Scoring**
   - Context-aware weighting
   - Pattern recognition
   - Confidence levels
   - Uncertainty handling

### Privacy & Performance

- **100% Local Processing**: All AI runs on your infrastructure
- **No External APIs**: Data never leaves your servers
- **24-Hour Caching**: AI results cached to reduce compute
- **Automatic Fallback**: Uses rule-based scoring if AI unavailable

## Troubleshooting

### Common Issues

#### Ollama Not Running
```bash
# Check if Ollama is running
ps aux | grep ollama

# Start Ollama if not running
ollama serve
```

#### Models Not Found
```bash
# List installed models
ollama list

# Re-pull models if missing
ollama pull mistral:7b
ollama pull tinyllama:1.1b
```

#### Slow Performance
- Ensure adequate RAM (8GB minimum)
- Consider using GPU acceleration
- Use "quick" mode with TinyLlama for faster results
- Check cache is working (24-hour TTL)

#### Connection Errors
```bash
# Test Ollama connection
curl http://localhost:11434/api/version

# Check Ollama logs
journalctl -u ollama -f  # Linux with systemd
```

### Environment Variable Issues
Ensure variables are loaded:
```javascript
// Check in your app
console.log('Ollama enabled:', process.env.ENABLE_OLLAMA)
console.log('Ollama URL:', process.env.OLLAMA_BASE_URL)
```

## Advanced Configuration

### Using Remote Ollama Server
```bash
# Point to remote Ollama instance
OLLAMA_BASE_URL=http://your-server:11434
```

### GPU Acceleration (Optional)
```bash
# Install NVIDIA Container Toolkit for Docker
# Then run Ollama with GPU support
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 ollama/ollama
```

### Custom Models
```bash
# Try other models for different performance/quality tradeoffs
ollama pull llama2:7b         # Alternative to Mistral
ollama pull phi:2.7b          # Smaller, faster option
ollama pull mixtral:8x7b      # Larger, more capable (requires 48GB RAM)

# Update environment variables
OLLAMA_PRIMARY_MODEL=llama2:7b
OLLAMA_FAST_MODEL=phi:2.7b
```

## Monitoring & Metrics

### Check AI Scoring Performance
```sql
-- Query AI scoring usage in Supabase
SELECT
  COUNT(*) as total_ai_scores,
  AVG((ai_analysis->>'ai_metadata'->>'analysis_time_ms')::int) as avg_time_ms,
  COUNT(DISTINCT company_id) as unique_companies
FROM lead_scores
WHERE use_ai_scoring = true
AND created_at > NOW() - INTERVAL '7 days';
```

### Monitor Cache Hit Rate
```sql
-- Check cache effectiveness
SELECT
  COUNT(*) as cached_analyses,
  AVG(EXTRACT(EPOCH FROM (expires_at - cached_at))/3600) as avg_cache_hours
FROM ai_scoring_cache
WHERE cached_at > NOW() - INTERVAL '24 hours';
```

## Best Practices

1. **Start with Quick Mode**: Test with TinyLlama first for faster feedback
2. **Use Caching**: Don't disable cache unless testing changes
3. **Monitor Resources**: Watch RAM/CPU usage during analysis
4. **Batch Processing**: Use batch endpoint for multiple companies
5. **Fallback Ready**: Ensure rule-based scoring works as backup

## Support & Resources

- **Ollama Documentation**: https://ollama.com/docs
- **Model Library**: https://ollama.com/library
- **oppSpot AI Scoring Code**: `/lib/ai/scoring/`
- **Database Schema**: `/supabase/migrations/20250118_add_ai_scoring_cache.sql`

## Quick Test Script

Save as `test-ai-scoring.js`:

```javascript
async function testAIScoring() {
  const response = await fetch('http://localhost:3000/api/scoring/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add your auth headers here
    },
    body: JSON.stringify({
      company_name: 'Google UK Limited',
      use_ai: true,
      ai_depth: 'quick',
      include_explanations: true
    })
  });

  const result = await response.json();
  console.log('AI Score:', result.score?.overall_score);
  console.log('Confidence:', result.score?.confidence_level);
  console.log('Explanation:', result.explanation);
}

testAIScoring();
```

---

**Note**: After setup, the AI scoring system will automatically enhance your lead scoring with intelligent analysis while keeping all data processing local and private.