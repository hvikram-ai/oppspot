/**
 * Selected Countries Display Component
 *
 * Displays the countries selected for an Opp Scan, fetching details from the database
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Globe, Database, Building2 } from 'lucide-react';

interface Country {
  country_code: string;
  name: string;
  continent: string;
  data_source_coverage: 'excellent' | 'good' | 'limited' | 'minimal';
  company_registry_type?: 'free_api' | 'paid_api' | 'web_scraping' | 'none';
  currency_code: string;
  currency_symbol?: string;
}

interface SelectedCountriesDisplayProps {
  countryCodes: string[];
  title?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function SelectedCountriesDisplay({
  countryCodes,
  title = 'Target Countries',
  showDetails = true,
  compact = false,
}: SelectedCountriesDisplayProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCountries() {
      if (!countryCodes || countryCodes.length === 0) {
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('countries')
        .select(
          'country_code, name, continent, data_source_coverage, company_registry_type, currency_code, currency_symbol'
        )
        .in('country_code', countryCodes)
        .order('name');

      if (!error && data) {
        setCountries(data);
      }

      setLoading(false);
    }

    fetchCountries();
  }, [countryCodes]);

  const getContinentEmoji = (continent: string): string => {
    const emojiMap: Record<string, string> = {
      Africa: '🌍',
      Americas: '🌎',
      Asia: '🌏',
      Europe: '🇪🇺',
      Oceania: '🌊',
    };
    return emojiMap[continent] || '🌐';
  };

  const getDataCoverageBadge = (coverage: string) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'outline' | 'destructive'
    > = {
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
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (countries.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {countries.map((country) => (
          <Badge
            key={country.country_code}
            variant="outline"
            className="flex items-center gap-1"
          >
            <span>{getContinentEmoji(country.continent)}</span>
            <span>{country.name}</span>
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {countries.length} {countries.length === 1 ? 'country' : 'countries'} selected
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {countries.map((country) => (
            <div
              key={country.country_code}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getContinentEmoji(country.continent)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{country.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {country.country_code}
                    </Badge>
                  </div>
                  {showDetails && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {country.continent}
                      </span>
                      {country.currency_code && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {country.currency_symbol || country.currency_code}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {showDetails && (
                <div className="flex items-center gap-2">
                  {getDataCoverageBadge(country.data_source_coverage)}

                  {country.company_registry_type === 'free_api' && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Building2 className="h-3 w-3" />
                      Free API
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        {showDetails && countries.length > 1 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Data Coverage:</span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {['excellent', 'good', 'limited'].map((coverage) => {
                    const count = countries.filter(
                      (c) => c.data_source_coverage === coverage
                    ).length;
                    if (count === 0) return null;
                    return (
                      <Badge key={coverage} variant="outline" className="text-xs">
                        {coverage}: {count}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Free APIs:</span>
                <div className="mt-1">
                  <Badge variant="outline" className="text-xs">
                    {countries.filter((c) => c.company_registry_type === 'free_api').length} /{' '}
                    {countries.length}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
