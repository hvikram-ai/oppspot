'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FolderOpen,
  Search,
  Grid3x3,
  List as ListIcon,
  Plus,
  Trash2,
  Eye,
  Edit2,
  MoreVertical,
  Building2,
  Calendar,
  X,
  ChevronLeft
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
import { CreateListDialog } from '@/components/chatspot/create-list-dialog'
import Link from 'next/link'

interface BusinessList {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  is_public: boolean
  created_at: string
  updated_at: string
  business_count?: number
}

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
    address: any
    latitude: number | null
    longitude: number | null
    rating: number | null
    phone_numbers: any
    website: string | null
    verified: boolean
  }
}

export default function ListsPage() {
  const [lists, setLists] = useState<BusinessList[]>([])
  const [filteredLists, setFilteredLists] = useState<BusinessList[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'card' | 'list'>('card')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedList, setSelectedList] = useState<BusinessList | null>(null)
  const [listBusinesses, setListBusinesses] = useState<SavedBusiness[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    fetchLists()
  }, [])

  useEffect(() => {
    filterLists()
  }, [lists, searchQuery])

  const fetchLists = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsDemo(true)
        loadDemoData()
        return
      }

      // Fetch lists with business count
      const { data: listsData, error: listsError } = await supabase
        .from('business_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (listsError) throw listsError

      // For each list, count the businesses
      const listsWithCounts = await Promise.all(
        (listsData || []).map(async (list) => {
          const { count } = await supabase
            .from('saved_businesses')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id)

          return {
            ...list,
            business_count: count || 0
          }
        })
      )

      setLists(listsWithCounts)
    } catch (error) {
      console.error('Error fetching lists:', error)
      toast.error('Failed to load lists')
      loadDemoData()
    } finally {
      setLoading(false)
    }
  }

  const loadDemoData = () => {
    const demoLists: BusinessList[] = [
      {
        id: '1',
        name: 'Q1 Prospects 2025',
        description: 'High-value prospects for Q1 outreach campaign',
        color: '#3b82f6',
        icon: 'target',
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        business_count: 12
      },
      {
        id: '2',
        name: 'London Tech Companies',
        description: 'SaaS and fintech companies in London',
        color: '#10b981',
        icon: 'building',
        is_public: false,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        business_count: 8
      },
      {
        id: '3',
        name: 'Warm Leads',
        description: 'Companies that showed interest',
        color: '#f59e0b',
        icon: 'fire',
        is_public: false,
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 172800000).toISOString(),
        business_count: 5
      }
    ]
    setLists(demoLists)
    setLoading(false)
  }

  const filterLists = () => {
    let filtered = lists

    if (searchQuery) {
      filtered = filtered.filter(list =>
        list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        list.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredLists(filtered)
  }

  const handleViewList = async (list: BusinessList) => {
    setSelectedList(list)
    setLoadingBusinesses(true)

    if (isDemo) {
      // Demo data
      setTimeout(() => {
        setListBusinesses([])
        setLoadingBusinesses(false)
      }, 500)
      return
    }

    try {
      const supabase = createClient()
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
        .eq('list_id', list.id)
        .order('saved_at', { ascending: false })

      if (error) throw error

      const formattedData = data?.filter(item => item.businesses).map(item => ({
        ...item,
        business: item.businesses!
      })) || []

      setListBusinesses(formattedData as SavedBusiness[])
    } catch (error) {
      console.error('Error fetching list businesses:', error)
      toast.error('Failed to load businesses')
    } finally {
      setLoadingBusinesses(false)
    }
  }

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      return
    }

    if (isDemo) {
      setLists(prev => prev.filter(l => l.id !== listId))
      toast.success('List deleted')
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('business_lists')
        .delete()
        .eq('id', listId)

      if (error) throw error

      setLists(prev => prev.filter(l => l.id !== listId))
      toast.success('List deleted successfully')
    } catch (error) {
      console.error('Error deleting list:', error)
      toast.error('Failed to delete list')
    }
  }

  const handleRemoveFromList = async (businessId: string) => {
    if (!selectedList) return

    if (isDemo) {
      setListBusinesses(prev => prev.filter(b => b.id !== businessId))
      toast.success('Business removed from list')
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('saved_businesses')
        .delete()
        .eq('id', businessId)

      if (error) throw error

      setListBusinesses(prev => prev.filter(b => b.id !== businessId))

      // Update business count
      setLists(prev => prev.map(list =>
        list.id === selectedList.id
          ? { ...list, business_count: (list.business_count || 1) - 1 }
          : list
      ))

      toast.success('Business removed from list')
    } catch (error) {
      console.error('Error removing business:', error)
      toast.error('Failed to remove business')
    }
  }

  const CardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence>
        {filteredLists.map((list, index) => (
          <motion.div
            key={list.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: list.color }}
                      />
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {list.description || 'No description'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewList(list)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Businesses
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit List
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteList(list.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-sm">
                      <Building2 className="h-3 w-3 mr-1" />
                      {list.business_count || 0} {list.business_count === 1 ? 'company' : 'companies'}
                    </Badge>
                    {list.is_public && (
                      <Badge variant="outline" className="text-xs">
                        Public
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Updated {new Date(list.updated_at).toLocaleDateString()}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewList(list)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View List
                  </Button>
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
                <th className="p-4">Description</th>
                <th className="p-4">Businesses</th>
                <th className="p-4">Updated</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLists.map((list) => (
                <tr key={list.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: list.color }}
                      />
                      <div className="font-medium">{list.name}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {list.description || 'No description'}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary">
                      {list.business_count || 0}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(list.updated_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewList(list)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => handleDeleteList(list.id)}
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
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Business Lists</h1>
        </div>
        <p className="text-muted-foreground">
          Organize your prospects into custom lists for targeted outreach
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
                  placeholder="Search lists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create List
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
                  <ListIcon className="h-4 w-4" />
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
            <p className="text-muted-foreground">Loading lists...</p>
          </div>
        </div>
      ) : filteredLists.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery
                  ? 'No lists match your search'
                  : 'No lists yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Create your first list to organize your prospects'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First List
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Showing {filteredLists.length} of {lists.length} lists
            </p>
          </div>
          {view === 'card' ? <CardView /> : <ListView />}
        </>
      )}

      {/* List Detail Modal */}
      {selectedList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedList(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedList.color }}
                      />
                      <CardTitle>{selectedList.name}</CardTitle>
                    </div>
                    <CardDescription>
                      {selectedList.description || 'No description'}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedList(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBusinesses ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading businesses...</p>
                  </div>
                </div>
              ) : listBusinesses.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No businesses in this list yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listBusinesses.map((item) => (
                    <Card key={item.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/business/${item.business_id}`}
                              className="font-medium hover:underline text-sm"
                              target="_blank"
                            >
                              {item.business.name}
                            </Link>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {item.business.description || 'No description'}
                            </p>
                            {item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-600"
                            onClick={() => handleRemoveFromList(item.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create List Dialog */}
      <CreateListDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onListCreated={(listId, listName) => {
          fetchLists()
          toast.success(`List "${listName}" created successfully`)
        }}
      />

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="fixed bottom-4 right-4">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            Demo Mode - Sample Data
          </Badge>
        </div>
      )}
    </div>
  )
}
