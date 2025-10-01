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
  Microscope,
  Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/hooks/use-sidebar'
import { SidebarItem } from './sidebar-item'
import { SidebarSection } from './sidebar-section'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen } = useSidebar()
  const router = useRouter()

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b">
        {!isCollapsed && (
          <h2 className="font-semibold text-lg">Navigation</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className={cn('h-8 w-8', isCollapsed && 'mx-auto')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Dashboard - Pinned Top */}
          <SidebarItem
            href="/dashboard"
            icon={Home}
            label="Dashboard"
            tooltip="Your command center with insights and metrics"
            isCollapsed={isCollapsed}
          />

          <Separator />

          {/* DISCOVER Section */}
          <SidebarSection
            title="Discover"
            icon={Compass}
            isCollapsed={isCollapsed}
            defaultOpen={true}
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
          </SidebarSection>

          {/* RESEARCH Section */}
          <SidebarSection
            title="Research"
            icon={Microscope}
            isCollapsed={isCollapsed}
            defaultOpen={true}
          >
            <SidebarItem
              href="/opp-scan"
              icon={Target}
              label="Opp Scan"
              tooltip="Premium: Comprehensive acquisition intelligence and strategic fit analysis"
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
          </SidebarSection>

          {/* OUTREACH Section */}
          <SidebarSection
            title="Outreach"
            icon={Send}
            isCollapsed={isCollapsed}
            defaultOpen={true}
          >
            <SidebarItem
              href="/lists"
              icon={Sparkles}
              label="Lists"
              tooltip="Create and organize custom prospect lists with tags and notes"
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

          {/* STREAMS Section - Placeholder for now */}
          <SidebarSection
            title="Streams"
            icon={FolderOpen}
            isCollapsed={isCollapsed}
            defaultOpen={false}
          >
            <div className={cn(
              'text-xs text-muted-foreground px-3 py-2',
              isCollapsed && 'hidden'
            )}>
              Coming soon: Project workspaces
            </div>
          </SidebarSection>
        </div>
      </ScrollArea>

      {/* Settings - Pinned Bottom */}
      <div className="p-2 border-t space-y-1">
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
      </div>
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
