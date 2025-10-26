# Pinecone Setup Guide

Quick setup for Pinecone vector database (5 minutes).

## Step 1: Create Pinecone Account

1. Go to: https://www.pinecone.io/
2. Click "Sign Up" (free tier available)
3. Verify your email
4. Log in to dashboard: https://app.pinecone.io/

## Step 2: Create an Index

1. In Pinecone dashboard, click "Create Index"
2. Configure:
   - **Name**: `oppspot-rag` (or your preferred name)
   - **Dimensions**: `1536` (OpenAI text-embedding-3-small)
   - **Metric**: `cosine`
   - **Environment**: Choose your region (e.g., `us-east-1`)
   - **Plan**: Starter (free) or Serverless

3. Click "Create Index"
4. Wait 1-2 minutes for index to be ready

## Step 3: Get API Credentials

1. In Pinecone dashboard, go to "API Keys"
2. Copy your **API Key**
3. Note your **Environment** (e.g., `us-east-1-aws`)
4. Note your **Index Name** (e.g., `oppspot-rag`)

## Step 4: Add to .env.local

Add these lines to your `.env.local` file:

```bash
# Pinecone Vector Database (for RAG)
PINECONE_API_KEY=your_api_key_here
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=oppspot-rag
```

**Example:**
```bash
PINECONE_API_KEY=pcsk_abc123_xyZ789DefGhiJklMnoPqrStuVwxYz
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=oppspot-rag
```

## Step 5: Verify Configuration

Run this command:

```bash
node scripts/test-pinecone-connection.js
```

Expected output: ✅ "Pinecone connected successfully"

---

## Pricing Information

**Free Tier:**
- 1 index
- 100K vectors
- Perfect for development and testing

**Paid Plans:**
- Start at $70/month
- Unlimited indexes
- Higher performance

For oppSpot with ~1,000 users × 100 vectors = 100K vectors = **FREE!**

---

## Index Configuration Details

**Why these settings?**

- **Dimensions: 1536** - Matches OpenAI `text-embedding-3-small` model
- **Metric: cosine** - Best for text similarity
- **Environment** - Choose closest to your users for lower latency

---

## Troubleshooting

**"Index not ready"**
- Wait 2-3 minutes after creation
- Refresh the dashboard

**"Authentication failed"**
- Double-check API key (no extra spaces)
- Ensure you copied the full key

**"Index not found"**
- Verify index name matches exactly
- Check you're in the correct project

---

## Next Steps After Setup

Once Pinecone is configured:

1. ✅ Test the connection
2. ✅ Start the dev server: `npm run dev`
3. ✅ Test RAG preferences API
4. ✅ Index your first user's data
5. ✅ Test RAG-powered search

See `docs/PHASE_2_TESTING.md` for complete testing guide.
