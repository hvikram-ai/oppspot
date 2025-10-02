'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bookmark, 
  Search, 
  Grid3x3, 
  List, 
  Filter,
  Download,
  Trash2,
  Eye,
  MapPin,
  Star,
  Calendar,
  Tag,
  MoreVertical,
  Building2,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'

interface SavedBusiness {
  id: string
  business_id: string
  saved_at: string
  notes: string | null
  tags: string[]
  business: {
    id: string
    name: string
    description: string | null
    categories: string[]
    address: unknown
    latitude: number | null
    longitude: number | null
    rating: number | null
    phone_numbers: unknown
    website: string | null
    verified: boolean
  }
}

export default function SavedBusinessesPage() {
  const [savedBusinesses, setSavedBusinesses] = useState<SavedBusiness[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<SavedBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'card' | 'list'>('card')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<SavedBusiness | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    fetchSavedBusinesses()
  }, [])

  useEffect(() => {
    filterBusinesses()
  }, [savedBusinesses, searchQuery, selectedTags])

  const fetchSavedBusinesses = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Demo mode
        setIsDemo(true)
        loadDemoData()
        return
      }

      const { data, error } = await supabase
        .from('saved_businesses')
        .select(`
          id,
          business_id,
          saved_at,
          notes,
          tags,
          businesses (
            id,
            name,
            description,
            categories,
            address,
            latitude,
            longitude,
            rating,
            phone_numbers,
            website,
            verified
          )
        `)
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false })

      if (error) throw error

      const formattedData = data?.filter(item => item.businesses).map(item => ({
        ...item,
        business: item.businesses!
      })) || []

      setSavedBusinesses(formattedData as SavedBusiness[])
    } catch (error) {
      console.error('Error fetching saved businesses:', error)
      toast.error('Failed to load saved businesses')
      loadDemoData()
    } finally {
      setLoading(false)
    }
  }

  const loadDemoData = () => {
    const demoData: SavedBusiness[] = [
      {
        id: '1',
        business_id: 'demo-1',
        saved_at: new Date().toISOString(),
        notes: 'Great potential partner for Q2',
        tags: ['partner', 'tech'],
        business: {
          id: 'demo-1',
          name: 'TechCorp Solutions',
          description: 'Leading technology consulting firm specializing in digital transformation',
          categories: ['Technology', 'Consulting'],
          address: { city: 'London', country: 'UK' },
          latitude: 51.5074,
          longitude: -0.1278,
          rating: 4.5,
          phone_numbers: ['+44 20 7946 0958'],
          website: 'https://techcorp.example.com',
          verified: true
        }
      },
      {
        id: '2',
        business_id: 'demo-2',
        saved_at: new Date(Date.now() - 86400000).toISOString(),
        notes: null,
        tags: ['retail', 'prospect'],
        business: {
          id: 'demo-2',
          name: 'Green Retail Group',
          description: 'Sustainable retail chain with focus on eco-friendly products',
          categories: ['Retail', 'Sustainability'],
          address: { city: 'Manchester', country: 'UK' },
          latitude: 53.4808,
          longitude: -2.2426,
          rating: 4.2,
          phone_numbers: ['+44 161 946 0958'],
          website: 'https://greenretail.example.com',
          verified: false
        }
      }
    ]
    setSavedBusinesses(demoData)
    setLoading(false)
  }

  const filterBusinesses = () => {
    let filtered = savedBusinesses

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.business.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(item =>
        selectedTags.some(tag => item.tags.includes(tag))
      )
    }

    setFilteredBusinesses(filtered)
  }

  const handleRemove = async (id: string) => {
    if (isDemo) {
      setSavedBusinesses(prev => prev.filter(item => item.id !== id))
      toast.success('Business removed from saved list')
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('saved_businesses')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSavedBusinesses(prev => prev.filter(item => item.id !== id))
      toast.success('Business removed from saved list')
    } catch (error) {
      console.error('Error removing business:', error)
      toast.error('Failed to remove business')
    }
  }

  const handleExport = () => {
    const data = filteredBusinesses.map(item => ({
      name: item.business.name,
      description: item.business.description,
      categories: item.business.categories.join(', '),
      website: item.business.website,
      saved_at: item.saved_at,
      notes: item.notes,
      tags: item.tags.join(', ')
    }))

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'saved-businesses.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported successfully')
  }

  const getAllTags = () => {
    const tags = new Set<string>()
    savedBusinesses.forEach(item => {
      item.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags)
  }

  const CardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence>
        {filteredBusinesses.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.business.name}</CardTitle>
                    {item.business.verified && (
                      <Badge variant="secondary" className="mt-1">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedBusiness(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`/business/${item.business_id}`, '_blank')}>
                        <Building2 className="mr-2 h-4 w-4" />
                        Open Page
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleRemove(item.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {item.business.description || 'No description available'}
                </p>
                
                <div className="space-y-2 text-sm">
                  {item.business.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.business.categories.slice(0, 2).map(cat => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {item.business.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{item.business.rating}</span>
                    </div>
                  )}
                  
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Saved {new Date(item.saved_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  const ListView = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-4">Name</th>
                <th className="p-4">Categories</th>
                <th className="p-4">Location</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Tags</th>
                <th className="p-4">Saved</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBusinesses.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{item.business.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {item.business.description}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {item.business.categories.slice(0, 2).map(cat => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3" />
                      {typeof item.business.address === 'object' && item.business.address ? 
                        (item.business.address as { city?: string }).city || 'Unknown' : 
                        'Unknown'}
                    </div>
                  </td>
                  <td className="p-4">
                    {item.business.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{item.business.rating}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(item.saved_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedBusiness(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => handleRemove(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bookmark className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Saved Businesses</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your saved businesses and prospects
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search saved businesses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter by Tags
                      {selectedTags.length > 0 && (
                        <Badge className="ml-2" variant="secondary">
                          {selectedTags.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48">
                    {getAllTags().map(tag => (
                      <DropdownMenuItem
                        key={tag}
                        onClick={() => {
                          setSelectedTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          )
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag)}
                            readOnly
                          />
                          {tag}
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {getAllTags().length === 0 && (
                      <DropdownMenuItem disabled>
                        No tags available
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>

                <div className="flex border rounded-md">
                  <Button
                    variant={view === 'card' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setView('card')}
                    className="rounded-r-none"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={view === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setView('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading saved businesses...</p>
            </div>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery || selectedTags.length > 0
                    ? 'No businesses match your filters'
                    : 'No saved businesses yet'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedTags.length > 0
                    ? 'Try adjusting your search or filters'
                    : 'Start saving businesses from search results or the map'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Showing {filteredBusinesses.length} of {savedBusinesses.length} saved businesses
              </p>
            </div>
            {view === 'card' ? <CardView /> : <ListView />}
          </>
        )}

        {/* Detail Modal */}
        {selectedBusiness && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedBusiness.business.name}</CardTitle>
                    <CardDescription>
                      Saved on {new Date(selectedBusiness.saved_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedBusiness(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="notes">Notes & Tags</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm">
                        {selectedBusiness.business.description || 'No description available'}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedBusiness.business.categories.map(cat => (
                          <Badge key={cat} variant="outline">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {selectedBusiness.business.rating && (
                      <div>
                        <h4 className="font-semibold mb-2">Rating</h4>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-5 w-5 ${
                                i < Math.floor(selectedBusiness.business.rating!)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span>{selectedBusiness.business.rating}</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="notes" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-sm">
                        {selectedBusiness.notes || 'No notes added yet'}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedBusiness.tags.length > 0 ? (
                          selectedBusiness.tags.map(tag => (
                            <Badge key={tag} variant="secondary">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No tags added</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="contact" className="space-y-4">
                    {selectedBusiness.business.website && (
                      <div>
                        <h4 className="font-semibold mb-2">Website</h4>
                        <a 
                          href={selectedBusiness.business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {selectedBusiness.business.website}
                        </a>
                      </div>
                    )}
                    
                    {selectedBusiness.business.phone_numbers && (
                      <div>
                        <h4 className="font-semibold mb-2">Phone</h4>
                        <p className="text-sm">
                          {Array.isArray(selectedBusiness.business.phone_numbers)
                            ? selectedBusiness.business.phone_numbers.join(', ')
                            : 'Not available'}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="fixed bottom-4 right-4">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Demo Mode - Sample Data
            </Badge>
          </div>
        )}
      </div>
    </>
  )
}