# oppSpot - UK & Ireland Business Intelligence Platform

An AI-powered business discovery platform for finding and analyzing UK & Ireland business opportunities.

## 🚀 Features

- **AI-Powered Search**: Natural language search to find businesses
- **Interactive Maps**: Geographic visualization of business data
- **Smart Insights**: AI-generated business analysis and recommendations
- **Team Collaboration**: Real-time sharing and collaboration on business lists
- **Data Export**: Export business data in various formats
- **GDPR Compliant**: Secure and privacy-focused

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **AI**: OpenRouter API for LLM capabilities
- **Maps**: Google Maps API / Mapbox
- **Hosting**: Vercel
- **Analytics**: Vercel Analytics, PostHog

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenRouter API key
- Google Maps API key (optional)

## 🔧 Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/hvikram-ai/oppspot.git
   cd oppspot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `OPENROUTER_API_KEY`: Your OpenRouter API key

4. **Set up Supabase database**
   
   Run the SQL schema in your Supabase SQL editor:
   ```bash
   # Copy contents from supabase/schema.sql
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hvikram-ai/oppspot)

## 📝 Project Structure

```
oppspot/
├── app/                  # Next.js app directory
│   ├── api/             # API routes
│   ├── auth/            # Auth routes
│   ├── dashboard/       # Dashboard page
│   └── ...             
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── layout/         # Layout components
│   └── ui/             # UI components (shadcn)
├── lib/                # Utility libraries
│   └── supabase/       # Supabase client config
├── types/              # TypeScript types
├── public/             # Static assets
└── supabase/           # Database schema
```

## 🔑 Key Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Linting & Formatting
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues

# Type checking
npm run type-check   # Run TypeScript compiler check
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ using Next.js, Supabase, and AI