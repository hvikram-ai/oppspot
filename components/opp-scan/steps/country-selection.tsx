/**
 * Country Selection Step - Database-Driven Global Country Selection
 *
 * Replaces hardcoded UK/Ireland regions with dynamic country selection
 * from the countries database table.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Building2,
  Gavel,
  TrendingUp,
  DollarSign,
  Shield,
  Search,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  Globe,
  Database,
} from 'lucide-react';

interface Country {
  id: string;
  country_code: string;
  country_code_alpha3: string;
  name: string;
  continent: string;
  region?: string;
  capital?: string;
  currency_code: string;
  currency_symbol?: string;
  population?: number;
  gdp_usd?: number;
  gdp_per_capita_usd?: number;
  business_density?: 'low' | 'moderate' | 'high' | 'very_high';
  regulatory_complexity?: 'low' | 'moderate' | 'high' | 'very_high';
  legal_system?: string;
  corporate_tax_rate?: number;
  vat_gst_rate?: number;
  ease_of_business_score?: number;
  corruption_perception_index?: number;
  geopolitical_risk?: 'minimal' | 'low' | 'moderate' | 'high' | 'very_high';
  key_industries?: string[];
  trade_agreements?: string[];
  has_company_registry: boolean;
  company_registry_type?: 'free_api' | 'paid_api' | 'web_scraping' | 'none';
  company_registry_notes?: string;
  data_source_coverage: 'excellent' | 'good' | 'limited' | 'minimal';
  enabled: boolean;
  notes?: string;
}

interface CountryConfig {
  selectedCountries?: string[]; // Array of country codes
  crossBorderConsiderations?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CountrySelectionProps {
  config: CountryConfig;
  updateConfig: (updates: Partial<CountryConfig>) => void;
}

export function CountrySelectionStep({ config, updateConfig }: CountrySelectionProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [continentFilter, setContinentFilter] = useState<string>('all');
  const [dataCoverageFilter, setDataCoverageFilter] = useState<string>('all');
  const [showOnlyFreeAPI, setShowOnlyFreeAPI] = useState(false);

  const selectedCountries = (config.selectedCountries || []) as string[];

  // Wrap fetchCountries in useCallback to prevent stale closures
  const fetchCountries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        enabled: 'true',
      });

      if (continentFilter !== 'all') {
        params.set('continent', continentFilter);
      }

      if (dataCoverageFilter !== 'all') {
        params.set('data_coverage', dataCoverageFilter);
      }

      if (showOnlyFreeAPI) {
        params.set('has_free_api', 'true');
      }

      const response = await fetch(`/api/opp-scan/countries?${params}`);
      const data = await response.json();

      setCountries(data.countries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
    }
  }, [continentFilter, dataCoverageFilter, showOnlyFreeAPI]);

  // Fetch countries from API
  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  // Filter countries by search term
  const filteredCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.country_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.country_code_alpha3.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle country selection
  function toggleCountry(countryCode: string) {
    const newSelection = selectedCountries.includes(countryCode)
      ? selectedCountries.filter((c) => c !== countryCode)
      : [...selectedCountries, countryCode];

    updateConfig({ selectedCountries: newSelection });
  }

  // Select all filtered countries
  function selectAllFiltered() {
    const allCodes = filteredCountries.map((c) => c.country_code);
    const uniqueCodes = Array.from(new Set([...selectedCountries, ...allCodes]));
    updateConfig({ selectedCountries: uniqueCodes });
  }

  // Clear selection
  function clearSelection() {
    updateConfig({ selectedCountries: [] });
  }

  // Get continent icon
  function getContinentEmoji(continent: string): string {
    const emojiMap: Record<string, string> = {
      'Africa': '🌍',
      'Americas': '🌎',
      'Asia': '🌏',
      'Europe': '🇪🇺',
      'Oceania': '🌊',
    };
    return emojiMap[continent] || '🌐';
  }

  // Get data coverage badge
  function getDataCoverageBadge(coverage: string) {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      excellent: 'default',
      good: 'secondary',
      limited: 'outline',
      minimal: 'destructive',
    };

    return (
      <Badge variant={variants[coverage] || 'outline'} className="text-xs">
        {coverage}
      </Badge>
    );
  }

  // Get selected countries details
  const selectedCountriesDetails = countries.filter((c) =>
    selectedCountries.includes(c.country_code)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Geographic Scope</h3>
        <p className="text-sm text-muted-foreground">
          Select countries to scan for acquisition opportunities. We support 195 countries with
          varying data coverage.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Search Countries</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code (e.g., 'United States', 'US', 'USA')..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Continent Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Continent</Label>
              <Select value={continentFilter} onValueChange={setContinentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Continents</SelectItem>
                  <SelectItem value="Africa">🌍 Africa</SelectItem>
                  <SelectItem value="Americas">🌎 Americas</SelectItem>
                  <SelectItem value="Asia">🌏 Asia</SelectItem>
                  <SelectItem value="Europe">🇪🇺 Europe</SelectItem>
                  <SelectItem value="Oceania">🌊 Oceania</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Coverage</Label>
              <Select value={dataCoverageFilter} onValueChange={setDataCoverageFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Registry Access</Label>
              <div className="flex items-center space-x-2 h-10">
                <Checkbox
                  id="free-api"
                  checked={showOnlyFreeAPI}
                  onCheckedChange={(checked) => setShowOnlyFreeAPI(checked === true)}
                />
                <label
                  htmlFor="free-api"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Free API Only
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllFiltered}
              disabled={filteredCountries.length === 0}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Select All ({filteredCountries.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              disabled={selectedCountries.length === 0}
            >
              <X className="mr-2 h-4 w-4" />
              Clear Selection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Countries Summary */}
      {selectedCountries.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Selected Countries ({selectedCountries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedCountriesDetails.map((country) => (
                <Badge
                  key={country.country_code}
                  variant="default"
                  className="flex items-center gap-1 cursor-pointer hover:bg-primary/80"
                  onClick={() => toggleCountry(country.country_code)}
                >
                  <span>{getContinentEmoji(country.continent)}</span>
                  <span>{country.name}</span>
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Countries List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading countries...</div>
        ) : filteredCountries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No countries match your filters. Try adjusting your search criteria.
          </div>
        ) : (
          filteredCountries.map((country) => {
            const isSelected = selectedCountries.includes(country.country_code);

            return (
              <Card
                key={country.country_code}
                className={`cursor-pointer transition-all hover:border-primary ${
                  isSelected ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => toggleCountry(country.country_code)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Country Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <span className="text-2xl">{getContinentEmoji(country.continent)}</span>
                        <div>
                          <h4 className="font-semibold">
                            {country.name}{' '}
                            <span className="text-xs text-muted-foreground">
                              ({country.country_code})
                            </span>
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {country.region && `${country.region} • `}
                            {country.capital && `Capital: ${country.capital}`}
                          </p>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className="gap-1">
                          <Database className="h-3 w-3" />
                          {getDataCoverageBadge(country.data_source_coverage)}
                        </Badge>

                        {country.has_company_registry && (
                          <Badge variant="outline" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {country.company_registry_type === 'free_api'
                              ? 'Free API'
                              : country.company_registry_type === 'paid_api'
                              ? 'Paid API'
                              : country.company_registry_type === 'web_scraping'
                              ? 'Web Data'
                              : 'Registry'}
                          </Badge>
                        )}

                        {country.business_density && (
                          <Badge variant="outline" className="gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {country.business_density} density
                          </Badge>
                        )}

                        {country.ease_of_business_score && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            EoDB: {country.ease_of_business_score}/100
                          </Badge>
                        )}

                        {country.geopolitical_risk && country.geopolitical_risk !== 'minimal' && (
                          <Badge
                            variant={
                              country.geopolitical_risk === 'high' ||
                              country.geopolitical_risk === 'very_high'
                                ? 'destructive'
                                : 'outline'
                            }
                            className="gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {country.geopolitical_risk} risk
                          </Badge>
                        )}
                      </div>

                      {/* Notes */}
                      {country.notes && (
                        <p className="text-xs text-muted-foreground italic">{country.notes}</p>
                      )}
                    </div>

                    {/* Quick Stats */}
                    {(country.gdp_per_capita_usd || country.corporate_tax_rate) && (
                      <div className="text-right text-xs space-y-1">
                        {country.gdp_per_capita_usd && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            <span>${(country.gdp_per_capita_usd / 1000).toFixed(0)}k GDP/capita</span>
                          </div>
                        )}
                        {country.corporate_tax_rate !== null &&
                          country.corporate_tax_rate !== undefined && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Gavel className="h-3 w-3" />
                              <span>{country.corporate_tax_rate}% corp tax</span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Help Text */}
      {selectedCountries.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <Info className="h-4 w-4 inline mr-2" />
            Select at least one country to continue. We recommend starting with countries that have
            excellent or good data coverage.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
