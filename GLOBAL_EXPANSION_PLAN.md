# Plan to Transform oppSpot into a Global Opportunity Scout Platform

## Executive Summary
This document outlines a comprehensive strategy to transform oppSpot from a UK/Ireland-focused B2B intelligence platform into a truly global opportunity discovery tool. The plan maintains backward compatibility while progressively enabling worldwide functionality.

## Current State Analysis
oppSpot is currently limited to:
- **Geographic Focus**: UK and Ireland only
- **Data Sources**: Companies House (UK) and Irish CRO
- **Currency**: GBP-centric with hardcoded £ symbols
- **Regulatory**: UK/EU specific compliance
- **Language**: English only
- **Industry Codes**: UK SIC codes

## Transformation Strategy

### 1. Multi-Region Data Source Integration

#### Create Global Data Source Registry
Extend the existing `DataSourceFactory` to support company registries from multiple countries:

**North America:**
- United States: SEC EDGAR API, Dun & Bradstreet, Crunchbase
- Canada: Corporations Canada, provincial registries
- Mexico: Sistema de Información Empresarial Mexicano (SIEM)

**Europe:**
- European Business Register (EBR) for cross-border searches
- Germany: Handelsregister
- France: INSEE/Infogreffe
- Netherlands: KVK
- Spain: Registro Mercantil Central
- Italy: Registro Imprese

**Asia-Pacific:**
- Singapore: ACRA (Accounting and Corporate Regulatory Authority)
- Hong Kong: Companies Registry
- Japan: EDINET, COSMOS
- Australia: ASIC Connect
- India: Ministry of Corporate Affairs
- China: National Enterprise Credit Information Publicity System

**Latin America:**
- Brazil: Receita Federal, JUCESP
- Argentina: IGJ (Inspección General de Justicia)
- Chile: Registro de Empresas y Sociedades

**Africa & Middle East:**
- South Africa: CIPC (Companies and Intellectual Property Commission)
- Kenya: eCitizen Business Registration Service
- UAE: DED (Department of Economic Development)
- Nigeria: Corporate Affairs Commission

### 2. Database Schema Internationalization

#### Core Schema Updates
```sql
-- Add country and region support
ALTER TABLE businesses ADD COLUMN country_code VARCHAR(2);
ALTER TABLE businesses ADD COLUMN region_code VARCHAR(10);
ALTER TABLE businesses ADD COLUMN currency_code VARCHAR(3);
ALTER TABLE businesses ADD COLUMN global_identifier VARCHAR(50);
ALTER TABLE businesses ADD COLUMN local_identifier VARCHAR(50);

-- Create reference tables
CREATE TABLE countries (
    code VARCHAR(2) PRIMARY KEY,
    name VARCHAR(100),
    native_name VARCHAR(100),
    currency_code VARCHAR(3),
    languages TEXT[],
    timezone VARCHAR(50),
    business_registry_url TEXT,
    regulatory_notes TEXT
);

CREATE TABLE currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(50),
    symbol VARCHAR(5),
    decimal_places INTEGER
);

CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY,
    from_currency VARCHAR(3),
    to_currency VARCHAR(3),
    rate DECIMAL(20, 6),
    date DATE,
    source VARCHAR(50)
);

CREATE TABLE industry_classifications (
    id UUID PRIMARY KEY,
    system VARCHAR(20), -- 'SIC', 'NAICS', 'NACE', 'ISIC'
    code VARCHAR(20),
    description TEXT,
    country_code VARCHAR(2)
);
```

### 3. Multi-Currency Support

#### Financial Handling Architecture
- Store all monetary values with currency codes (ISO 4217)
- Implement real-time exchange rate service integration
- Create currency conversion utilities
- Add user preference for display currency
- Support cryptocurrency valuations for tech companies

#### Implementation Components:
```typescript
// lib/services/currency-service.ts
interface CurrencyService {
  convertAmount(amount: number, from: string, to: string): Promise<number>
  getExchangeRate(from: string, to: string): Promise<number>
  formatCurrency(amount: number, currency: string, locale: string): string
  getSupportedCurrencies(): Currency[]
}
```

### 4. Internationalization (i18n) Framework

#### Language Support Implementation
- Implement next-i18next for multi-language support
- Initial language support: EN, ES, FR, DE, ZH, JA, PT, AR
- Create translation management system
- Implement RTL support for Arabic/Hebrew
- Add locale-specific formatting (dates, numbers, addresses)

#### Key Translation Areas:
- UI components and navigation
- Business terminology and metrics
- Legal and compliance terms
- Industry classifications
- Error messages and notifications

### 5. Global Search & Discovery Engine

#### Enhanced Search Architecture
```typescript
// lib/services/global-registry-service.ts
interface ICompanyRegistry {
  searchCompanies(query: SearchQuery): Promise<CompanyResult[]>
  getCompanyDetails(id: string): Promise<CompanyDetails>
  validateIdentifier(id: string): boolean
  getSupportedCountries(): string[]
  getRequiredFields(): RegistryField[]
}

// Implement adapters for each registry
class CompaniesHouseAdapter implements ICompanyRegistry { }
class SECEdgarAdapter implements ICompanyRegistry { }
class ACRASingaporeAdapter implements ICompanyRegistry { }
```

#### Global Identifier System
- LEI (Legal Entity Identifier) for financial institutions
- DUNS Number for international trade
- VAT/Tax ID mappings
- Custom internal global ID generation

### 6. Region-Specific Business Intelligence

#### Scoring & Analytics Adaptations
- **Industry Classifications Mapping:**
  - UK SIC ↔ US NAICS
  - EU NACE ↔ UN ISIC
  - Country-specific codes

- **Regional Business Metrics:**
  - Market size indicators per country
  - Local competition analysis
  - Regional growth rates
  - Country risk scores
  - Ease of doing business rankings

- **Compliance Scoring:**
  - GDPR compliance (EU)
  - CCPA compliance (California)
  - Data localization requirements
  - Industry-specific regulations

### 7. Global Map Visualization

#### Map Enhancement Features
- Replace UK-centric view with global perspective
- Implement dynamic map centering based on search
- Add cluster visualization for global density
- Support for different map projections
- Timezone-aware business hours overlay
- Trade route and supply chain visualization

### 8. Regulatory Compliance Framework

#### Multi-Jurisdiction Support Matrix
| Region | Data Protection | Business Regulations | Tax Compliance |
|--------|----------------|---------------------|----------------|
| EU | GDPR | EU Company Law | VAT |
| US | CCPA/State Laws | SEC/State Regs | Federal/State |
| China | PIPL | Company Law | CIT/VAT |
| India | DPDP Act | Companies Act | GST |
| Brazil | LGPD | Civil Code | Federal Taxes |

### 9. API & Integration Layer

#### Global Data Aggregation Strategy
```typescript
// lib/api/global-gateway.ts
class GlobalDataGateway {
  private sources: Map<string, ICompanyRegistry>
  private rateLimiter: RateLimiter
  private cache: CacheService
  private qualityScorer: DataQualityScorer

  async searchGlobally(params: GlobalSearchParams): Promise<AggregatedResults> {
    // Parallel search across applicable sources
    // Deduplicate results
    // Score data quality
    // Apply fallback strategies
  }
}
```

### 10. Configuration & Deployment

#### Environment Configuration
```env
# Region-specific API keys
US_SEC_API_KEY=xxx
EU_EBR_API_KEY=xxx
SG_ACRA_API_KEY=xxx
JP_EDINET_API_KEY=xxx

# Feature flags
ENABLE_US_MARKET=true
ENABLE_EU_MARKET=true
ENABLE_APAC_MARKET=false

# CDN Configuration
CDN_GLOBAL_ENDPOINT=xxx
CDN_REGIONS=us-east-1,eu-west-1,ap-southeast-1
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Database schema updates for internationalization
- [ ] Multi-currency support implementation
- [ ] Abstract registry interface design
- [ ] Currency conversion service integration

### Phase 2: Core Expansion (Weeks 5-8)
- [ ] US market integration (SEC EDGAR, Crunchbase)
- [ ] EU market integration (EBR, major countries)
- [ ] Data source abstraction layer
- [ ] Global search API implementation

### Phase 3: Geographic Expansion (Weeks 9-12)
- [ ] Asia-Pacific integrations (Singapore, HK, Japan)
- [ ] i18n framework setup
- [ ] Initial translations (EN, ES, FR, DE, ZH)
- [ ] Global map visualization updates

### Phase 4: Intelligence Enhancement (Weeks 13-16)
- [ ] Regional scoring algorithms
- [ ] Cross-border opportunity detection
- [ ] Regulatory compliance tracking
- [ ] Industry classification mapping

### Phase 5: Optimization (Weeks 17-20)
- [ ] Performance optimization for global queries
- [ ] CDN deployment across regions
- [ ] Advanced caching strategies
- [ ] A/B testing for regional preferences

## Key Files to Modify

### Core Services
- `/lib/services/companies-house.ts` → Refactor into registry adapter
- `/lib/services/global-registry-service.ts` → New unified registry service
- `/lib/services/currency-service.ts` → New currency handling service

### Data Sources
- `/lib/opp-scan/data-sources/data-source-factory.ts` → Add global sources
- `/lib/opp-scan/data-sources/[country]-adapter.ts` → New country adapters

### Database
- `/supabase/migrations/xxx_global_expansion.sql` → Schema updates
- `/types/database.ts` → Updated TypeScript types

### UI Components
- `/components/opp-scan/steps/region-selection.tsx` → Global region selector
- `/components/ui/currency-display.tsx` → New currency component
- `/components/map/global-business-map.tsx` → Enhanced map component

### API Routes
- `/app/api/companies/global/search/route.ts` → Global search endpoint
- `/app/api/exchange-rates/route.ts` → Currency conversion endpoint
- `/app/api/regions/[country]/route.ts` → Country-specific endpoints

### AI & Scoring
- `/lib/ai/scoring/global-scoring-service.ts` → International scoring
- `/lib/ai/knowledge-base.ts` → Multi-language knowledge base

## Success Metrics

### Technical KPIs
- API response time < 2s for global searches
- 99.9% uptime across all regions
- Support for 50+ countries
- 10+ language translations

### Business KPIs
- 5x increase in addressable market
- 3x increase in user base
- 40% of revenue from non-UK markets
- 90% user satisfaction score

## Risk Mitigation

### Technical Risks
- **Data Quality Variance**: Implement quality scoring and confidence levels
- **API Reliability**: Build fallback mechanisms and caching
- **Performance at Scale**: Use CDN and regional deployments
- **Currency Fluctuations**: Update rates frequently, show conversion timestamps

### Compliance Risks
- **Data Protection**: Implement region-specific data handling
- **Export Controls**: Track and enforce trade restrictions
- **Tax Implications**: Partner with local tax advisors
- **Licensing**: Ensure proper API licensing per country

## Budget Considerations

### API Costs (Annual)
- SEC EDGAR: Free
- Crunchbase: $49,000/year (Pro plan)
- D&B: $30,000/year (estimated)
- Various national registries: $50,000/year (combined)
- Currency API: $1,000/year
- Translation services: $10,000/year

### Infrastructure
- Multi-region deployment: +$2,000/month
- CDN costs: +$500/month
- Enhanced caching: +$300/month

### Development
- 3 developers × 5 months = 15 developer-months
- 1 DevOps engineer × 3 months = 3 engineer-months
- 1 Product manager × 5 months = 5 PM-months

## Conclusion

Transforming oppSpot into a global platform is a significant but achievable goal. This phased approach ensures:
1. Minimal disruption to existing UK/Ireland functionality
2. Progressive rollout with measurable milestones
3. Flexibility to adjust based on market response
4. Scalable architecture for future expansion

The key to success will be maintaining data quality and user experience while managing the complexity of multiple data sources, currencies, languages, and regulatory environments.

## Next Steps
1. Review and approve the plan
2. Allocate resources and budget
3. Set up development environment for Phase 1
4. Begin database schema migration
5. Start US and EU API integration research