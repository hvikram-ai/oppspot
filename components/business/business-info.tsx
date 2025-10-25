'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Info, 
  Clock, 
  Users, 
  Award,
  TrendingUp,
  Calendar,
  Building,
  Hash
} from 'lucide-react'

interface BusinessInfoProps {
  business: {
    id: string
    name: string
    description?: string | null
    categories?: string[] | null
    founded_year?: number | null
    employee_count?: string | null
    revenue_range?: string | null
    business_hours?: {
      [key: string]: { open: string; close: string }
    } | null
    certifications?: string[] | null
    specialties?: string[] | null
    google_place_id?: string | null
    created_at?: string | null
    updated_at?: string | null
    [key: string]: unknown
  }
}

export function BusinessInfo({ business }: BusinessInfoProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const currentDay = daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Business Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="hours" className="text-xs sm:text-sm">Hours</TabsTrigger>
            <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Company Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {business.founded_year && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Founded</span>
                  </div>
                  <p className="font-medium">{business.founded_year}</p>
                </div>
              )}
              
              {business.employee_count && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Employees</span>
                  </div>
                  <p className="font-medium">{business.employee_count}</p>
                </div>
              )}
              
              {business.revenue_range && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Revenue</span>
                  </div>
                  <p className="font-medium">{business.revenue_range}</p>
                </div>
              )}
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span className="text-sm">Type</span>
                </div>
                <p className="font-medium">
                  {business.categories?.[0] || 'Business'}
                </p>
              </div>
            </div>

            {/* Specialties */}
            {business.specialties && business.specialties.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {business.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {business.certifications && business.certifications.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Certifications & Awards
                </h4>
                <div className="flex flex-wrap gap-2">
                  {business.certifications.map((cert) => (
                    <Badge key={cert} variant="secondary">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hours" className="mt-4">
            {business.business_hours ? (
              <div className="space-y-2">
                {daysOfWeek.map((day) => {
                  const hours = business.business_hours?.[day]
                  const isToday = day === currentDay
                  
                  return (
                    <div 
                      key={day}
                      className={`flex items-center justify-between py-2 px-3 rounded ${
                        isToday ? 'bg-accent' : ''
                      }`}
                    >
                      <span className={`capitalize ${isToday ? 'font-medium' : ''}`}>
                        {day}
                        {isToday && (
                          <Badge className="ml-2" variant="default">Today</Badge>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {hours ? `${hours.open} - ${hours.close}` : 'Closed'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>Business hours not available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Additional Details */}
            <div className="space-y-3">
              {business.google_place_id && (
                <div className="flex items-start gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Google Place ID</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {business.google_place_id}
                    </p>
                  </div>
                </div>
              )}
              
              {business.created_at && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Listed Since</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(business.created_at)}
                    </p>
                  </div>
                </div>
              )}
              
              {business.updated_at && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(business.updated_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}