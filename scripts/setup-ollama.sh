#!/bin/bash

echo "🚀 Setting up Ollama for OppSpot AI Features"
echo "============================================"

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Please install it first:"
    echo "   curl -fsSL https://ollama.com/install.sh | sh"
    exit 1
fi

# Check if Ollama service is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "⚠️  Ollama service is not running. Starting it..."
    ollama serve &
    sleep 5
fi

echo "✅ Ollama is installed and running"
echo ""
echo "📦 Pulling required models..."

# Pull the required models
echo "1. Pulling llama3.2:3b (primary model)..."
ollama pull llama3.2:3b

echo "2. Pulling llama3.2:1b (fast model)..."
ollama pull llama3.2:1b

# Alternative: Pull smaller models if the above fail
if [ $? -ne 0 ]; then
    echo "⚠️  Failed to pull llama3.2 models. Trying alternatives..."
    echo "   Pulling mistral:7b..."
    ollama pull mistral:7b
    echo "   Pulling phi:2.7b..."
    ollama pull phi:2.7b
fi

echo ""
echo "🎯 Testing Ollama connection..."
curl -s http://localhost:11434/api/tags | jq -r '.models[].name' 2>/dev/null || echo "Models available"

echo ""
echo "✅ Ollama setup complete!"
echo ""
echo "To use different models, set these environment variables:"
echo "  export OLLAMA_PRIMARY_MODEL=llama3.2:3b"
echo "  export OLLAMA_FAST_MODEL=llama3.2:1b"
echo "  export OLLAMA_BASE_URL=http://localhost:11434"
echo ""
echo "Happy analyzing! 🎉"