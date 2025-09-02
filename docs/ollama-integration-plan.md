# Ollama Integration Plan for Similar Company LLM Services

## 🎯 **Objective**
Replace OpenRouter LLM integration with local Ollama models to power your Similar Company analysis feature, providing better cost control, privacy, and customization for your $50,000 client.

## 📊 **Current State Analysis**
- **LLM Integration**: Currently using OpenRouter with Claude 3.5 Sonnet ($15/1M tokens) and Claude 3 Haiku ($2.50/1M tokens)
- **Key Service**: `SimilarityExplanationService` handles all LLM operations for M&A analysis
- **Usage Patterns**: 
  - Comprehensive similarity explanations (1,500 tokens)
  - M&A insights generation (2,000 tokens) 
  - Quick summaries (200 tokens)
  - Risk assessments (600 tokens)
  - Opportunity analysis (800 tokens)

## 🏗️ **Implementation Plan**

### **Phase 1: Ollama Installation & Setup**

#### 1. Install Ollama on your system
```bash
# macOS (recommended)
curl -fsSL https://ollama.com/install.sh | sh

# Alternative: Download from https://ollama.com/download
# For other platforms, visit: https://ollama.com/download
```

#### 2. Pull recommended models for M&A analysis
```bash
# Primary model for detailed analysis (13B parameters)
ollama pull llama3.1:13b

# Secondary model for quick tasks (8B parameters)  
ollama pull llama3.1:8b

# Alternative: Mistral for financial analysis
ollama pull mistral:7b-instruct

# Alternative: Code Llama for structured outputs
ollama pull codellama:13b-instruct

# Optional: Specialized finance model
ollama pull llama3.1:70b  # If you have sufficient RAM (64GB+)
```

#### 3. Start Ollama service
```bash
ollama serve
# Service will be available at http://localhost:11434

# Test the installation
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Test prompt",
  "stream": false
}'
```

### **Phase 2: Create Ollama Client Integration**

#### 1. Create new Ollama service (`/lib/ai/ollama.ts`)
```typescript
interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

interface GenerationOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  top_p?: number
  top_k?: number
}

export class OllamaClient {
  private baseUrl: string
  private primaryModel: string
  private fastModel: string
  
  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    this.primaryModel = process.env.OLLAMA_PRIMARY_MODEL || 'llama3.1:13b'
    this.fastModel = process.env.OLLAMA_FAST_MODEL || 'llama3.1:8b'
  }
  
  async complete(prompt: string, options: GenerationOptions = {}): Promise<string> {
    // Implementation details...
  }
  
  async validateAccess(): Promise<boolean> {
    // Health check implementation...
  }
  
  getModelCapabilities(): Record<string, any> {
    // Model capability definitions...
  }
}
```

#### 2. Environment configuration
Add to your `.env.local` or `.env`:
```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_PRIMARY_MODEL=llama3.1:13b
OLLAMA_FAST_MODEL=llama3.1:8b
ENABLE_OLLAMA=true

# Fallback to OpenRouter if needed
OPENROUTER_FALLBACK_ENABLED=true
```

### **Phase 3: Update SimilarityExplanationService**

#### 1. Create abstracted LLM interface
```typescript
interface LLMProvider {
  complete(prompt: string, options: GenerationOptions): Promise<string>
  validateAccess(): Promise<boolean>
  getModelCapabilities(): Record<string, any>
}

class OllamaClient implements LLMProvider {
  // Ollama-specific implementation
}

class OpenRouterClient implements LLMProvider {
  // Existing OpenRouter implementation
}
```

#### 2. Update SimilarityExplanationService
```typescript
export class SimilarityExplanationService {
  private llmProvider: LLMProvider
  
  constructor() {
    // Provider selection based on configuration
    if (process.env.ENABLE_OLLAMA === 'true') {
      this.llmProvider = new OllamaClient()
    } else {
      this.llmProvider = getAIClient() // OpenRouter fallback
    }
  }
  
  // Existing methods remain unchanged - just use this.llmProvider instead of this.aiClient
}
```

#### 3. Optimize prompts for local models
- Adjust system prompts for Llama 3.1 capabilities
- Fine-tune temperature settings (0.2-0.4 for factual M&A analysis)
- Optimize token limits for local model performance
- Test M&A explanation quality and adjust accordingly

### **Phase 4: Performance Optimization**

#### 1. Implement model warming
```typescript
class ModelWarmer {
  async warmModels(): Promise<void> {
    // Pre-load models on application startup
    await this.ollamaClient.complete("Warm-up prompt", { 
      model: this.primaryModel,
      max_tokens: 10 
    })
  }
  
  async keepAlive(): Promise<void> {
    // Keep models in memory for faster responses
    setInterval(() => {
      this.ollamaClient.complete("Keep alive", { max_tokens: 1 })
    }, 300000) // Every 5 minutes
  }
}
```

#### 2. Add response caching
```typescript
class LLMCache {
  private cache: Map<string, { response: string, timestamp: number }> = new Map()
  private ttl: number = 3600000 // 1 hour
  
  async getCachedResponse(prompt: string): Promise<string | null> {
    const cached = this.cache.get(this.hashPrompt(prompt))
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.response
    }
    return null
  }
  
  setCachedResponse(prompt: string, response: string): void {
    this.cache.set(this.hashPrompt(prompt), {
      response,
      timestamp: Date.now()
    })
  }
}
```

#### 3. Batch processing capabilities
```typescript
class BatchProcessor {
  async processBatch(analyses: SimilarityAnalysis[]): Promise<SimilarityExplanation[]> {
    // Process multiple company analyses together
    // Implement queue management for efficient processing
  }
}
```

### **Phase 5: Quality Assurance & Testing**

#### 1. Model comparison testing
```typescript
class ModelComparison {
  async compareProviders(testCases: TestCase[]): Promise<ComparisonResult> {
    // Compare output quality: Ollama vs OpenRouter
    // Test M&A-specific terminology accuracy
    // Validate explanation coherence and professionalism
  }
}
```

#### 2. Performance benchmarking
- Measure response times for different model sizes
- Test concurrent request handling capabilities
- Monitor memory and CPU usage during peak loads
- Benchmark token generation speed

#### 3. Integration testing
- Test all similarity analysis workflows end-to-end
- Verify visualization component compatibility
- Test demo mode functionality with local models
- Validate API response formats and error handling

## 🔧 **Technical Implementation Details**

### **Model Selection Rationale**

| Model | Use Case | RAM Required | Speed | Quality |
|-------|----------|-------------|-------|---------|
| **Llama 3.1 13B** | Primary M&A analysis | 8-10GB | Medium | Excellent |
| **Llama 3.1 8B** | Quick summaries | 5-6GB | Fast | Very Good |
| **Mistral 7B** | Financial analysis | 4-5GB | Fast | Good |
| **CodeLlama 13B** | Structured outputs | 8-10GB | Medium | Excellent |

### **API Integration Pattern**
```typescript
// Unified interface for seamless provider switching
interface LLMProvider {
  complete(prompt: string, options: GenerationOptions): Promise<string>
  validateAccess(): Promise<boolean>
  getModelCapabilities(): Record<string, any>
  estimateTokens(text: string): number
  calculateCost(tokens: number): number
}

// Factory pattern for provider selection
class LLMProviderFactory {
  static create(config: ProviderConfig): LLMProvider {
    switch (config.provider) {
      case 'ollama':
        return new OllamaClient(config)
      case 'openrouter':
        return new OpenRouterClient(config)
      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }
  }
}
```

### **Fallback Strategy**
```typescript
class LLMServiceWithFallback {
  private primaryProvider: LLMProvider
  private fallbackProvider: LLLProvider
  
  async complete(prompt: string, options: GenerationOptions): Promise<string> {
    try {
      return await this.primaryProvider.complete(prompt, options)
    } catch (error) {
      console.warn('Primary provider failed, falling back:', error)
      return await this.fallbackProvider.complete(prompt, options)
    }
  }
}
```

## 💰 **Cost & Performance Benefits**

### **Cost Analysis**
| Metric | OpenRouter | Ollama | Savings |
|--------|-----------|--------|---------|
| **Setup Cost** | $0 | Hardware upgrade (~$500-2000) | - |
| **Per 1M Tokens** | $15-25 | $0 | 100% |
| **Monthly at 10M tokens** | $150-250 | $0 | $1,800-3,000/year |
| **Break-even Point** | - | 1-2M tokens | ROI in weeks |

### **Performance Improvements**
- **Response Time**: 2-5 seconds (local) vs 5-15 seconds (API)
- **Throughput**: Limited by hardware vs API rate limits
- **Reliability**: No network dependencies vs internet connectivity required
- **Privacy**: 100% local vs cloud processing
- **Customization**: Full model control vs provider limitations

### **Resource Usage**
```bash
# Monitor Ollama resource usage
htop                    # CPU and memory monitoring
nvidia-smi             # GPU usage (if using GPU acceleration)
du -sh ~/.ollama       # Model storage usage
```

## 🚀 **Rollout Strategy**

### **Week 1: Setup & Integration**
- [ ] Install Ollama and configure service
- [ ] Pull and test recommended models
- [ ] Implement OllamaClient class
- [ ] Create abstracted LLM interface
- [ ] Update environment configuration

### **Week 2: Service Updates**
- [ ] Update SimilarityExplanationService
- [ ] Implement provider factory pattern
- [ ] Add fallback mechanisms
- [ ] Test basic functionality
- [ ] Configure model warming

### **Week 3: Optimization & Testing**
- [ ] Implement response caching
- [ ] Add batch processing capabilities
- [ ] Performance optimization tuning
- [ ] Quality assurance testing
- [ ] Model comparison analysis

### **Week 4: Production Deployment**
- [ ] Final integration testing
- [ ] Documentation updates
- [ ] Production deployment with monitoring
- [ ] Performance monitoring setup
- [ ] User acceptance testing

## ⚠️ **System Requirements & Considerations**

### **Minimum System Requirements**
- **RAM**: 16GB (32GB recommended for 13B models)
- **Storage**: 50GB free space for models and cache
- **CPU**: 8+ cores, modern processor (Apple Silicon ideal)
- **Network**: Only needed for initial model downloads
- **OS**: macOS, Linux, or Windows with Docker

### **Recommended Hardware Configuration**
```bash
# Check your system specs
system_profiler SPHardwareDataType  # macOS
lscpu && free -h                    # Linux
```

### **Potential Challenges & Solutions**

| Challenge | Impact | Solution |
|-----------|--------|----------|
| **Model Quality** | Lower accuracy than Claude | Fine-tune prompts, use larger models |
| **Response Time** | Slower than optimized cloud APIs | Model warming, GPU acceleration |
| **Memory Usage** | High RAM requirements | Model swapping, smaller models for simple tasks |
| **Updates** | Manual model management | Automated update scripts |
| **Scaling** | Limited by single machine | Distributed deployment, load balancing |

### **Migration Strategy**

#### **Phase 1: Dual Support (Week 1-2)**
```typescript
const config = {
  primaryProvider: 'ollama',
  fallbackProvider: 'openrouter',
  fallbackOnError: true,
  fallbackOnSlowResponse: true, // > 10 seconds
  testMode: true // A/B testing
}
```

#### **Phase 2: Gradual Migration (Week 3)**
- Enable Ollama for 25% of requests
- Monitor quality and performance metrics
- Gradually increase to 50%, then 75%

#### **Phase 3: Default to Ollama (Week 4)**
- Ollama becomes primary provider
- OpenRouter as fallback only
- Monitor for any quality regressions

#### **Phase 4: Full Migration (Optional)**
- Remove OpenRouter dependency
- Full local processing
- Cost savings maximized

## 📊 **Monitoring & Metrics**

### **Key Performance Indicators**
```typescript
interface OllamaMetrics {
  responseTime: number
  tokensPerSecond: number
  memoryUsage: number
  cpuUsage: number
  requestSuccess: number
  requestFailure: number
  fallbackRate: number
  qualityScore: number
}
```

### **Monitoring Setup**
```bash
# System monitoring
brew install htop iotop        # Resource monitoring
brew install prometheus node_exporter  # Metrics collection

# Application monitoring
npm install prom-client        # Prometheus metrics
npm install winston           # Logging
```

## 🔧 **Configuration Files**

### **Docker Compose (Optional)**
```yaml
version: '3.8'
services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama:/root/.ollama
    environment:
      - OLLAMA_ORIGINS=*
  
  oppspot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
    depends_on:
      - ollama

volumes:
  ollama:
```

### **Systemd Service (Linux)**
```ini
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=exec
ExecStart=/usr/local/bin/ollama serve
Restart=always
User=ollama
Group=ollama

[Install]
WantedBy=multi-user.target
```

## 📚 **Additional Resources**

### **Documentation & Guides**
- [Ollama Official Documentation](https://ollama.ai/docs)
- [Llama 3.1 Model Card](https://llama.meta.com/docs/model-cards-and-prompt-formats/llama3_1)
- [Ollama REST API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)

### **Community & Support**
- [Ollama GitHub Repository](https://github.com/ollama/ollama)
- [Ollama Discord Community](https://discord.gg/ollama)
- [Model Hub](https://ollama.ai/models)

### **Troubleshooting**
```bash
# Common Ollama troubleshooting commands
ollama list                    # List installed models
ollama show llama3.1:13b      # Show model details  
ollama rm llama3.1:13b        # Remove model
ollama pull llama3.1:13b      # Re-download model
journalctl -u ollama          # Check service logs
```

---

## 🎯 **Next Steps**

1. **Start with Phase 1**: Install Ollama and pull models
2. **Test basic functionality**: Verify models work correctly
3. **Implement OllamaClient**: Create the integration layer
4. **Test with existing workflows**: Ensure compatibility
5. **Optimize and deploy**: Fine-tune for production use

This comprehensive integration plan provides everything needed to successfully migrate from OpenRouter to local Ollama models while maintaining the high-quality M&A analysis capabilities your $50,000 client expects.

**Estimated Timeline**: 4 weeks for full integration  
**Estimated Cost Savings**: $1,800-3,000 annually  
**Expected Performance**: 2-5 second response times locally