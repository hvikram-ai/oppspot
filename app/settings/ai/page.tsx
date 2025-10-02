'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import {
  Brain,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  AlertCircle,
  Info,
  Sparkles,
  Server,
  Key,
  TestTube,
  Download,
  ExternalLink,
  Settings,
  Cpu
} from 'lucide-react'

interface AIProvider {
  id: string
  name: string
  icon: string
  description: string
  models: string[]
  requiresApiKey: boolean
  documentation: string
  isLocal?: boolean
}

interface SavedApiKey {
  id: string
  provider: string
  keyName: string
  maskedKey: string
  isActive: boolean
  lastUsed: string | null
  createdAt: string
}

const aiProviders: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT-4, GPT-3.5, and DALL-E models',
    models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
    requiresApiKey: true,
    documentation: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    description: 'Claude 3 Opus, Sonnet, and Haiku models',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    requiresApiKey: true,
    documentation: 'https://console.anthropic.com/account/keys'
  },
  {
    id: 'google',
    name: 'Google AI',
    icon: '🌟',
    description: 'Gemini Pro and Gemini Pro Vision',
    models: ['gemini-pro', 'gemini-pro-vision'],
    requiresApiKey: true,
    documentation: 'https://makersuite.google.com/app/apikey'
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    icon: '🌊',
    description: 'Mistral Large, Medium, and Small models',
    models: ['mistral-large', 'mistral-medium', 'mistral-small'],
    requiresApiKey: true,
    documentation: 'https://console.mistral.ai/api-keys'
  },
  {
    id: 'cohere',
    name: 'Cohere',
    icon: '🔮',
    description: 'Command, Generate, and Embed models',
    models: ['command', 'command-light'],
    requiresApiKey: true,
    documentation: 'https://dashboard.cohere.ai/api-keys'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🚀',
    description: 'Access multiple AI providers with one API',
    models: ['auto'],
    requiresApiKey: true,
    documentation: 'https://openrouter.ai/keys'
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    icon: '🦙',
    description: 'Run LLMs locally on your machine',
    models: ['llama2', 'mistral', 'phi-2', 'neural-chat', 'starling-lm'],
    requiresApiKey: false,
    documentation: 'https://ollama.ai',
    isLocal: true
  }
]

export default function AISettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiKeys, setApiKeys] = useState<SavedApiKey[]>([])
  const [selectedProvider, setSelectedProvider] = useState('openrouter')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({})
  const [isAddingKey, setIsAddingKey] = useState(false)
  const [newKey, setNewKey] = useState({ provider: '', name: '', key: '' })
  const [testingKey, setTestingKey] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
    checkOllamaStatus()
  }, [])

  const loadSettings = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in to manage AI settings')
        return
      }

      // Load user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settings) {
        setSelectedProvider(settings.default_ai_provider || 'openrouter')
        if (settings.local_llm_config?.ollama_url) {
          setOllamaUrl(settings.local_llm_config.ollama_url)
        }
      }

      // Load API keys (masked)
      const { data: keys } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (keys) {
        setApiKeys(keys.map(key => ({
          id: key.id,
          provider: key.provider,
          keyName: key.key_name,
          maskedKey: maskApiKey(key.provider),
          isActive: key.is_active,
          lastUsed: key.last_used,
          createdAt: key.created_at
        })))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load AI settings')
    } finally {
      setLoading(false)
    }
  }

  const maskApiKey = (provider: string) => {
    // Return a masked version for display
    return `${provider.slice(0, 3)}-****-****-****`
  }

  const checkOllamaStatus = async () => {
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`)
      if (response.ok) {
        const data = await response.json()
        setOllamaStatus('online')
        setAvailableModels(data.models?.map((m: any) => m.name) || [])
      } else {
        setOllamaStatus('offline')
      }
    } catch (error) {
      setOllamaStatus('offline')
    }
  }

  const handleAddApiKey = async () => {
    if (!newKey.provider || !newKey.name || !newKey.key) {
      toast.error('Please fill all fields')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: newKey.provider,
          keyName: newKey.name,
          apiKey: newKey.key
        })
      })

      if (!response.ok) throw new Error('Failed to save API key')

      toast.success('API key added successfully')
      setIsAddingKey(false)
      setNewKey({ provider: '', name: '', key: '' })
      loadSettings()
    } catch (error) {
      console.error('Error adding API key:', error)
      toast.error('Failed to add API key')
    } finally {
      setSaving(false)
    }
  }

  const handleTestApiKey = async (keyId: string) => {
    setTestingKey(keyId)
    try {
      const response = await fetch(`/api/settings/api-keys/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ keyId })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('API key is working correctly')
      } else {
        toast.error(`Test failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('Failed to test API key')
    } finally {
      setTestingKey(null)
    }
  }

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return

    try {
      const response = await fetch(`/api/settings/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to delete API key')

      toast.success('API key deleted')
      loadSettings()
    } catch (error) {
      toast.error('Failed to delete API key')
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in to save settings')
        return
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          default_ai_provider: selectedProvider,
          local_llm_config: {
            ollama_url: ollamaUrl
          },
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const downloadOllamaModel = async (modelName: string) => {
    toast.info(`Downloading ${modelName}...`)
    try {
      const response = await fetch(`${ollamaUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      })

      if (response.ok) {
        toast.success(`${modelName} downloaded successfully`)
        checkOllamaStatus()
      } else {
        toast.error(`Failed to download ${modelName}`)
      }
    } catch (error) {
      toast.error('Failed to connect to Ollama')
    }
  }

  if (loading) {
    return (

      <ProtectedLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (


    <ProtectedLayout>
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure AI providers to enable intelligent features like smart search, business insights, and automated analysis.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="providers">AI Providers</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="local">Local LLMs</TabsTrigger>
        </TabsList>

        {/* AI Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Default AI Provider</CardTitle>
              <CardDescription>
                Choose your preferred AI provider for all AI-powered features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedProvider} onValueChange={setSelectedProvider}>
                <div className="grid gap-4">
                  {aiProviders.filter(p => !p.isLocal).map(provider => (
                    <div key={provider.id} className="flex items-start space-x-3">
                      <RadioGroupItem value={provider.id} id={provider.id} />
                      <div className="flex-1">
                        <Label htmlFor={provider.id} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{provider.icon}</span>
                            <span className="font-medium">{provider.name}</span>
                            {apiKeys.some(k => k.provider === provider.id && k.isActive) && (
                              <Badge variant="secondary" className="ml-2">
                                <Check className="h-3 w-3 mr-1" />
                                Configured
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {provider.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {provider.models.map(model => (
                              <Badge key={model} variant="outline" className="text-xs">
                                {model}
                              </Badge>
                            ))}
                          </div>
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(provider.documentation, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <div className="mt-6 pt-6 border-t">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Provider Settings'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for different AI providers
                  </CardDescription>
                </div>
                <Dialog open={isAddingKey} onOpenChange={setIsAddingKey}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New API Key</DialogTitle>
                      <DialogDescription>
                        Your API key will be encrypted and stored securely
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="provider">Provider</Label>
                        <Select
                          value={newKey.provider}
                          onValueChange={(value) => setNewKey({ ...newKey, provider: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {aiProviders.filter(p => p.requiresApiKey).map(provider => (
                              <SelectItem key={provider.id} value={provider.id}>
                                <div className="flex items-center gap-2">
                                  <span>{provider.icon}</span>
                                  <span>{provider.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="name">Key Name</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Production Key"
                          value={newKey.name}
                          onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="key">API Key</Label>
                        <Input
                          id="key"
                          type="password"
                          placeholder="sk-..."
                          value={newKey.key}
                          onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingKey(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddApiKey} disabled={saving}>
                        {saving ? 'Adding...' : 'Add Key'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No API keys configured</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add API keys to enable AI-powered features
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map(key => {
                    const provider = aiProviders.find(p => p.id === key.provider)
                    return (

                      <div key={key.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{provider?.icon}</span>
                              <span className="font-medium">{provider?.name}</span>
                              <Badge variant={key.isActive ? 'default' : 'secondary'}>
                                {key.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {key.keyName}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Added {new Date(key.createdAt).toLocaleDateString()}</span>
                              {key.lastUsed && (
                                <span>Last used {new Date(key.lastUsed).toLocaleDateString()}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {showApiKey[key.id] ? 'API_KEY_SHOWN' : key.maskedKey}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setShowApiKey({ ...showApiKey, [key.id]: !showApiKey[key.id] })}
                              >
                                {showApiKey[key.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestApiKey(key.id)}
                              disabled={testingKey === key.id}
                            >
                              {testingKey === key.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <TestTube className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteApiKey(key.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Local LLMs Tab */}
        <TabsContent value="local" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Local LLM Configuration (Ollama)
              </CardTitle>
              <CardDescription>
                Run AI models locally on your machine for complete privacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ollama Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${
                    ollamaStatus === 'online' ? 'bg-green-500' : 
                    ollamaStatus === 'offline' ? 'bg-red-500' : 
                    'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="font-medium">Ollama Server Status</p>
                    <p className="text-sm text-muted-foreground">
                      {ollamaStatus === 'online' ? 'Connected and ready' :
                       ollamaStatus === 'offline' ? 'Not running or unreachable' :
                       'Checking connection...'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkOllamaStatus}
                >
                  Refresh
                </Button>
              </div>

              {/* Ollama URL Configuration */}
              <div>
                <Label htmlFor="ollama-url">Ollama Server URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="ollama-url"
                    placeholder="http://localhost:11434"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      checkOllamaStatus()
                      handleSaveSettings()
                    }}
                  >
                    Update
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Default: http://localhost:11434
                </p>
              </div>

              {/* Available Models */}
              {ollamaStatus === 'online' && (
                <div>
                  <Label>Available Models</Label>
                  {availableModels.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableModels.map(model => (
                        <div key={model} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{model}</span>
                          <Badge variant="secondary" className="text-xs">
                            Installed
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      No models installed. Download models below.
                    </p>
                  )}
                </div>
              )}

              {/* Download Models */}
              {ollamaStatus === 'online' && (
                <div>
                  <Label>Download Models</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['llama2', 'mistral', 'phi-2', 'neural-chat'].map(model => (
                      <Button
                        key={model}
                        variant="outline"
                        size="sm"
                        onClick={() => downloadOllamaModel(model)}
                        disabled={availableModels.includes(model)}
                      >
                        <Download className="mr-2 h-3 w-3" />
                        {model}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Installation Help */}
              {ollamaStatus === 'offline' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">Ollama not detected</p>
                    <p className="text-sm mb-2">To use local LLMs, install Ollama:</p>
                    <ol className="text-sm list-decimal list-inside space-y-1">
                      <li>Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ollama.ai</a></li>
                      <li>Download and install Ollama for your OS</li>
                      <li>Run: <code className="bg-muted px-1 rounded">ollama serve</code></li>
                      <li>Click Refresh to check connection</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </ProtectedLayout>

  )
}