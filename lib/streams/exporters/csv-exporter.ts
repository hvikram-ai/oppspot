/**
 * Streams CSV Exporter
 * Generates CSV exports for stream data including items, activity, and members
 */

import { stringify } from 'csv-stringify/sync'

interface StreamExportData {
  stream: {
    id: string
    name: string
    description: string | null
    stream_type: string
    status: string
    created_at: string
    updated_at: string
  }
  items: Array<{
    id: string
    item_type: string
    title: string
    description: string | null
    stage_id: string | null
    priority: string
    status: string
    assigned_to: string | null
    due_date: string | null
    completion_percentage: number
    created_at: string
    updated_at: string
    assigned_user?: {
      id: string
      full_name: string | null
    } | null
    businesses?: {
      id: string
      name: string
      website: string | null
    } | null
  }>
  members: Array<{
    id: string
    user_id: string
    role: string
    joined_at: string
    user?: {
      id: string
      full_name: string | null
      email: string | null
    } | null
  }>
  activities: Array<{
    id: string
    activity_type: string
    description: string
    created_at: string
    user?: {
      id: string
      full_name: string | null
    } | null
  }>
}

/**
 * Generate CSV export with multiple sections
 */
export async function generateStreamsCSV(data: StreamExportData): Promise<string> {
  const { stream, items, members, activities } = data

  const sections: string[] = []

  // =====================================================
  // Section 1: Stream Information
  // =====================================================
  const streamInfo = [
    ['STREAM INFORMATION'],
    [''],
    ['Name', stream.name],
    ['Description', stream.description || 'N/A'],
    ['Type', stream.stream_type],
    ['Status', stream.status],
    ['Created', new Date(stream.created_at).toLocaleString('en-GB')],
    ['Last Updated', new Date(stream.updated_at).toLocaleString('en-GB')],
    [''],
    [''],
  ]

  sections.push(streamInfo.map(row => row.join(',')).join('\n'))

  // =====================================================
  // Section 2: Stream Items
  // =====================================================
  if (items.length > 0) {
    const itemRecords = items.map((item) => ({
      'Item Type': item.item_type,
      'Title': item.title,
      'Description': item.description || '',
      'Status': item.status,
      'Stage': item.stage_id || 'N/A',
      'Priority': item.priority,
      'Completion': `${item.completion_percentage}%`,
      'Assigned To': item.assigned_user?.full_name || 'Unassigned',
      'Due Date': item.due_date ? new Date(item.due_date).toLocaleDateString('en-GB') : 'N/A',
      'Company': item.businesses?.name || 'N/A',
      'Created': new Date(item.created_at).toLocaleDateString('en-GB'),
    }))

    const itemsCSV = stringify(itemRecords, {
      header: true,
    })

    sections.push('STREAM ITEMS')
    sections.push('')
    sections.push(itemsCSV)
    sections.push('')
  }

  // =====================================================
  // Section 3: Team Members
  // =====================================================
  if (members.length > 0) {
    const memberRecords = members.map((member) => ({
      'Name': member.user?.full_name || 'Unknown',
      'Email': member.user?.email || 'N/A',
      'Role': member.role,
      'Joined': new Date(member.joined_at).toLocaleDateString('en-GB'),
    }))

    const membersCSV = stringify(memberRecords, {
      header: true,
    })

    sections.push('TEAM MEMBERS')
    sections.push('')
    sections.push(membersCSV)
    sections.push('')
  }

  // =====================================================
  // Section 4: Recent Activity
  // =====================================================
  if (activities.length > 0) {
    const activityRecords = activities.map((activity) => ({
      'Activity': activity.activity_type.replace(/_/g, ' ').toUpperCase(),
      'Description': activity.description,
      'User': activity.user?.full_name || 'System',
      'Date': new Date(activity.created_at).toLocaleString('en-GB'),
    }))

    const activitiesCSV = stringify(activityRecords, {
      header: true,
    })

    sections.push('RECENT ACTIVITY (Last 100)')
    sections.push('')
    sections.push(activitiesCSV)
  }

  // =====================================================
  // Footer
  // =====================================================
  sections.push('')
  sections.push('')
  sections.push(`Generated: ${new Date().toLocaleString('en-GB')}`)
  sections.push('Source: oppSpot Streams Platform')

  return sections.join('\n')
}
