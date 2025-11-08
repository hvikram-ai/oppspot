'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home,
  Search,
  Map,
  Building2,
  Newspaper,
  Target,
  Brain,
  BarChart3,
  Sparkles,
  Users,
  Settings,
  User,
  CreditCard,
  UserCog,
  Download,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileSearch,
  Send,
  Zap,
  Activity,
  TrendingUp,
  Bookmark,
  ShieldCheck,
  Shield,
  AlertTriangle,
  GitBranch,
  MessageCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/hooks/use-sidebar'
import { useIsOrgAdmin } from '@/lib/rbac/hooks'
import { SidebarItem } from './sidebar-item'
import { SidebarSection } from './sidebar-section'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { CommandBarTrigger } from '@/components/command-bar/command-bar-trigger'
import Link from 'next/link'

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen } = useSidebar()
  const router = useRouter()
  const isOrgAdmin = useIsOrgAdmin()

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [router, setMobileOpen])

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setMobileOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setMobileOpen])

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* Header with Collapse Button Only */}
      <div className="p-4 flex items-center justify-end border-b bg-background/95 backdrop-blur">
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-7 w-7 hover:bg-muted"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-6">
          {/* Quick Search - Pinned Top */}
          <div className="px-1">
            <CommandBarTrigger variant={isCollapsed ? 'compact' : 'compact'} />
          </div>

          <Separator />

          {/* Dashboard - Pinned Top */}
          <div className="space-y-1">
            <SidebarItem
              href="/dashboard"
              icon={Home}
              label="Dashboard"
              tooltip="Your command center with insights and metrics"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/monitoring"
              icon={Activity}
              label="Live Monitoring"
              tooltip="Real-time monitoring of streams, scans, and system activity"
              isCollapsed={isCollapsed}
              isPremium
            />
            <SidebarItem
              href="/chatspot"
              icon={Sparkles}
              label="ChatSpot"
              tooltip="Talk to your data - natural language AI interface (no forms!)"
              isCollapsed={isCollapsed}
              isPremium
            />
          </div>

          <Separator className="my-2" />

          {/* DISCOVER Section */}
          <SidebarSection
            title="Discover"
            icon={Compass}
            isCollapsed={isCollapsed}
            defaultOpen={false}
          >
            <SidebarItem
              href="/search"
              icon={Search}
              label="Search"
              tooltip="Find businesses with AI-powered filters and location-based queries"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/map"
              icon={Map}
              label="Map"
              tooltip="Visualize business locations with clustering and territory analysis"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/companies"
              icon={Building2}
              label="Companies"
              tooltip="Search UK Companies House data with real-time information"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/updates"
              icon={Newspaper}
              label="Updates"
              tooltip="Latest business news, market updates, and acquisition opportunities"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/opp-scan"
              icon={Target}
              label="Opp Scan"
              tooltip="Premium: Comprehensive acquisition intelligence and strategic fit analysis"
              isCollapsed={isCollapsed}
              isPremium
            />
          </SidebarSection>

          {/* DILIGENCE Section */}
          <SidebarSection
            title="Diligence"
            icon={FileSearch}
            isCollapsed={isCollapsed}
            defaultOpen={false}
          >
            <SidebarItem
              href="/data-rooms"
              icon={FolderOpen}
              label="Data Rooms"
              tooltip="AI-powered due diligence workspaces with document analysis"
              isCollapsed={isCollapsed}
              isPremium
            />
            <SidebarItem
              href="/signals"
              icon={Activity}
              label="DealSignals"
              tooltip="Real-time buying signals and intent monitoring dashboard"
              isCollapsed={isCollapsed}
              isPremium
            />
            <SidebarItem
              href="/research"
              icon={Zap}
              label="ResearchGPT"
              tooltip="30-second deep company intelligence with AI-powered insights"
              isCollapsed={isCollapsed}
              isPremium
            />
            <SidebarItem
              href="/ma-targets"
              icon={Target}
              label="M&A Targets"
              tooltip="AI-powered M&A target prediction with valuation estimates and acquirer profiles"
              isCollapsed={isCollapsed}
              isPremium
            />
            <SidebarItem
              href="/timetravel"
              icon={TrendingUp}
              label="TimeTravel™"
              tooltip="Predict buying intent 30-90 days before active search"
              isCollapsed={isCollapsed}
              isPremium
            />
            <SidebarItem
              href="/icp"
              icon={Brain}
              label="ICP Learning"
              tooltip="Auto-refining Ideal Customer Profile that learns from won/lost deals"
              isCollapsed={isCollapsed}
              isPremium
            />
            <SidebarItem
              href="/ai-scoring"
              icon={Brain}
              label="AI Scoring"
              tooltip="Predictive lead scoring with deal probability and timing recommendations"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/benchmarking"
              icon={BarChart3}
              label="Benchmarking"
              tooltip="Compare company performance against industry standards and peers"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/stakeholders"
              icon={Users}
              label="Stakeholders"
              tooltip="Track relationships, identify champions, and manage influence"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/competitive-intelligence"
              icon={Target}
              label="Competitive Intel"
              tooltip="Track competitors with AI-powered feature parity, pricing analysis, and moat scoring"
              isCollapsed={isCollapsed}
              isPremium
            />
          </SidebarSection>

          {/* COLLABORATION Section */}
          <SidebarSection
            title="Collaboration"
            icon={Users}
            isCollapsed={isCollapsed}
            defaultOpen={false}
          >
            <SidebarItem
              href="/teamplay"
              icon={Users}
              label="TeamPlay"
              tooltip="Real-time team collaboration and activity tracking"
              isCollapsed={isCollapsed}
              isPremium
            />
            <SidebarItem
              href="/knowledge-graph"
              icon={Brain}
              label="Knowledge Graph"
              tooltip="Team intelligence memory - searchable knowledge about companies, people, and insights"
              isCollapsed={isCollapsed}
              isPremium
            />
          </SidebarSection>

          {/* OUTREACH Section */}
          <SidebarSection
            title="Outreach"
            icon={Send}
            isCollapsed={isCollapsed}
            defaultOpen={false}
          >
            <SidebarItem
              href="/lists"
              icon={FolderOpen}
              label="Lists"
              tooltip="Organize prospects into custom lists for targeted outreach"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/saved"
              icon={Bookmark}
              label="Saved Businesses"
              tooltip="View and manage all your saved businesses"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/qualification"
              icon={Target}
              label="Qualification"
              tooltip="Manage lead qualification with BANT and MEDDIC frameworks"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/analytics"
              icon={BarChart3}
              label="Analytics"
              tooltip="Performance metrics, conversion analytics, and ROI insights"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/export"
              icon={Download}
              label="Export Data"
              tooltip="Export prospect data and reports for CRM integration"
              isCollapsed={isCollapsed}
            />
          </SidebarSection>

          {/* STREAMS Section */}
          <SidebarSection
            title="Streams"
            icon={FolderOpen}
            isCollapsed={isCollapsed}
            defaultOpen={false}
          >
            <SidebarItem
              href="/streams"
              icon={FolderOpen}
              label="All Streams"
              tooltip="View and manage all your project workspaces"
              isCollapsed={isCollapsed}
            />
          </SidebarSection>
        </div>
      </ScrollArea>

      {/* Settings - Pinned Bottom */}
      <div className="p-3 border-t bg-background/50 backdrop-blur space-y-1">
        {/* Admin-only links */}
        {isOrgAdmin && (
          <>
            <SidebarItem
              href="/admin"
              icon={Shield}
              label="Admin Dashboard"
              tooltip="System administration and management hub"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/admin/alerts"
              icon={AlertTriangle}
              label="System Alerts"
              tooltip="Monitor and manage critical system failures and health"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/admin/agents"
              icon={Zap}
              label="AI Agents"
              tooltip="Manage autonomous AI agents (OpportunityBot, Scout Agent)"
              isCollapsed={isCollapsed}
              isPremium
            />
            <SidebarItem
              href="/agent-workflows"
              icon={GitBranch}
              label="Workflow Builder"
              tooltip="Build and execute multi-agent workflows with visual editor"
              isCollapsed={isCollapsed}
              isPremium
            />
            <SidebarItem
              href="/agents/analytics"
              icon={BarChart3}
              label="Agent Analytics"
              tooltip="Monitor agent performance, costs, and reliability"
              isCollapsed={isCollapsed}
              isPremium
            />
          </>
        )}

        {/* User links */}
        <SidebarItem
          href="/profile"
          icon={User}
          label="Profile"
          tooltip="Manage your profile and preferences"
          isCollapsed={isCollapsed}
        />
        <SidebarItem
          href="/team"
          icon={UserCog}
          label="Team Management"
          tooltip="Invite team members and manage permissions"
          isCollapsed={isCollapsed}
        />

        {/* Admin-only Role Management */}
        {isOrgAdmin && (
          <SidebarItem
            href="/admin/roles"
            icon={ShieldCheck}
            label="Role Management"
            tooltip="Manage user roles and permissions (Enterprise Admin only)"
            isCollapsed={isCollapsed}
          />
        )}

        {/* User links */}
        <SidebarItem
          href="/settings"
          icon={Settings}
          label="Settings"
          tooltip="Configure account preferences and integrations"
          isCollapsed={isCollapsed}
        />
        <SidebarItem
          href="/billing"
          icon={CreditCard}
          label="Billing"
          tooltip="Manage subscription and billing information"
          isCollapsed={isCollapsed}
        />
        <SidebarItem
          href="/feedback"
          icon={MessageCircle}
          label="Feedback"
          tooltip="Submit feedback, report bugs, or request features"
          isCollapsed={isCollapsed}
        />
      </div>

      {/* Collapse button at bottom for collapsed state */}
      {isCollapsed && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="w-full h-9 hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-background border-r transition-all duration-200 ease-in-out z-30',
          isCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <>
        {/* Backdrop */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Drawer */}
        <aside
          className={cn(
            'fixed left-0 top-0 h-screen w-60 bg-background border-r transition-transform duration-200 ease-in-out z-50 lg:hidden',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </>
    </>
  )
}
