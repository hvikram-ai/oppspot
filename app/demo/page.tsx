'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  Play, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Target,
  Bell,
  Map,
  Search,
  Building2,
  Sparkles,
  ArrowRight,
  Clock,
  Shield,
  Zap
} from 'lucide-react'
import { useDemoMode } from '@/lib/demo/demo-context'
import { motion } from 'framer-motion'

export default function DemoPage() {
  const router = useRouter()
  const { enableDemoMode } = useDemoMode()

  const startDemo = () => {
    enableDemoMode()
    router.push('/search?demo=true')
  }

  const features = [
    {
      icon: Search,
      title: 'Smart Search',
      description: 'AI-powered business discovery with advanced filters'
    },
    {
      icon: BarChart3,
      title: 'Predictive Analytics',
      description: 'Market trends, forecasts, and opportunity scoring'
    },
    {
      icon: Users,
      title: 'Competitor Analysis',
      description: 'Track competitors and identify market gaps'
    },
    {
      icon: Bell,
      title: 'Real-time Alerts',
      description: 'Instant notifications for market changes'
    },
    {
      icon: Map,
      title: 'Territory Mapping',
      description: 'Visual insights with heat maps and clustering'
    },
    {
      icon: Target,
      title: 'Lead Scoring',
      description: 'AI-driven lead qualification and prioritization'
    }
  ]

  const demoIncludes = [
    'Full access to search and filter features',
    'View 6 sample businesses with complete profiles',
    'Explore predictive analytics dashboard',
    'See market opportunities and trends',
    'Experience the complete UI/UX',
    'No time limits on demo exploration'
  ]

  const limitations = [
    'Cannot save searches or businesses',
    'Cannot export data or reports',
    'Cannot contact businesses',
    'Cannot create custom alerts',
    'Limited to sample data only'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <Badge className="mb-4" variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            Live Demo - No Login Required
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Experience oppSpot in Action
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8">
            Explore our AI-powered business intelligence platform with real sample data. 
            No registration, no credit card, just instant access.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={startDemo}
              className="group"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Live Demo
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/register')}
            >
              Create Free Account
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Instant access
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              No login required
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              Full UI experience
            </span>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          {features.map((feature, index) => (
            <Card key={index} className="border-muted hover:border-primary/50 transition-colors">
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* What's Included */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                Demo Includes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {demoIncludes.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <Shield className="h-5 w-5" />
                Demo Limitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {limitations.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sample Data Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12"
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Sample Demo Data</CardTitle>
              <CardDescription>
                Explore realistic business data across multiple industries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-primary">6</p>
                  <p className="text-sm text-muted-foreground">Sample Businesses</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">1,247</p>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">4.6</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">32%</p>
                  <p className="text-sm text-muted-foreground">Growth Rate</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center mt-6">
                <Badge variant="secondary">Technology</Badge>
                <Badge variant="secondary">Finance</Badge>
                <Badge variant="secondary">Healthcare</Badge>
                <Badge variant="secondary">Marketing</Badge>
                <Badge variant="secondary">Energy</Badge>
                <Badge variant="secondary">Logistics</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center mt-12 p-8 bg-primary/5 rounded-2xl"
        >
          <h2 className="text-2xl font-bold mb-4">Ready to Explore?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Take a test drive of oppSpot with our interactive demo. 
            See how our platform can transform your business intelligence workflow.
          </p>
          
          <Button
            size="lg"
            onClick={startDemo}
            className="group"
          >
            <Play className="h-5 w-5 mr-2" />
            Launch Demo Now
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            No signup required • Instant access • Full UI experience
          </p>
        </motion.div>
      </div>
    </div>
  )
}