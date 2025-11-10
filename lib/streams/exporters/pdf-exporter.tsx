/**
 * Streams PDF Exporter
 * Generates professional PDF reports for stream data with full visualization
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #6366f1',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 5,
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4f46e5',
    borderBottom: '1 solid #e2e8f0',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    color: '#475569',
  },
  value: {
    width: '70%',
    color: '#1e293b',
  },
  itemCard: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderLeft: '3 solid #6366f1',
    borderRadius: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  itemDescription: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    borderTop: '1 solid #e2e8f0',
    paddingTop: 10,
  },
  badge: {
    padding: '3 8',
    borderRadius: 4,
    fontSize: 8,
    marginRight: 5,
  },
  priorityHigh: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  priorityMedium: {
    backgroundColor: '#fef3c7',
    color: '#78350f',
  },
  priorityLow: {
    backgroundColor: '#dbeafe',
    color: '#1e3a8a',
  },
  statusActive: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusInProgress: {
    backgroundColor: '#dbeafe',
    color: '#1e3a8a',
  },
  statusCompleted: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e2e8f0',
    padding: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  activityItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderLeft: '2 solid #e2e8f0',
  },
  activityText: {
    fontSize: 9,
    color: '#1e293b',
  },
  activityMeta: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
  },
})

interface StreamExportData {
  stream: {
    id: string
    name: string
    description: string | null
    emoji: string
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
    completion_percentage: number
    assigned_to: string | null
    due_date: string | null
    created_at: string
    assigned_user?: {
      full_name: string | null
    } | null
    businesses?: {
      name: string
    } | null
  }>
  members: Array<{
    role: string
    joined_at: string
    user?: {
      full_name: string | null
      email: string | null
    } | null
  }>
  activities: Array<{
    activity_type: string
    description: string
    created_at: string
    user?: {
      full_name: string | null
    } | null
  }>
}

// PDF Document Component
const StreamsPDF: React.FC<{ data: StreamExportData }> = ({ data }) => {
  const { stream, items, members, activities } = data

  // Helper to get priority badge style
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'critical':
        return styles.priorityHigh
      case 'medium':
        return styles.priorityMedium
      default:
        return styles.priorityLow
    }
  }

  // Helper to get status badge style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return styles.statusCompleted
      case 'in_progress':
      case 'open':
        return styles.statusInProgress
      default:
        return styles.statusActive
    }
  }

  // Group items by stage
  const itemsByStage: Record<string, typeof items> = {}
  items.forEach((item) => {
    const stage = item.stage_id || 'unassigned'
    if (!itemsByStage[stage]) {
      itemsByStage[stage] = []
    }
    itemsByStage[stage].push(item)
  })

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {stream.emoji} {stream.name}
          </Text>
          {stream.description && (
            <Text style={styles.subtitle}>{stream.description}</Text>
          )}
          <Text style={styles.subtitle}>
            Stream Export • Generated: {new Date().toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        {/* Stream Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stream Overview</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.value}>{stream.stream_type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{stream.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Items:</Text>
            <Text style={styles.value}>{items.length}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Team Members:</Text>
            <Text style={styles.value}>{members.length}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Created:</Text>
            <Text style={styles.value}>
              {new Date(stream.created_at).toLocaleDateString('en-GB')}
            </Text>
          </View>
        </View>

        {/* Progress Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Statistics</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Completed:</Text>
            <Text style={styles.value}>
              {items.filter(i => i.status === 'completed').length} ({items.length > 0 ? ((items.filter(i => i.status === 'completed').length / items.length) * 100).toFixed(0) : 0}%)
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>In Progress:</Text>
            <Text style={styles.value}>
              {items.filter(i => i.status === 'in_progress').length}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Open:</Text>
            <Text style={styles.value}>
              {items.filter(i => i.status === 'open').length}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>High Priority:</Text>
            <Text style={styles.value}>
              {items.filter(i => i.priority === 'high' || i.priority === 'critical').length}
            </Text>
          </View>
        </View>

        {/* Team Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Members</Text>

          {members.slice(0, 10).map((member, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label}>{member.user?.full_name || 'Unknown'}:</Text>
              <Text style={styles.value}>{member.role}</Text>
            </View>
          ))}

          {members.length > 10 && (
            <Text style={{ fontSize: 9, color: '#64748b', marginTop: 5 }}>
              ... and {members.length - 10} more members
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text>
            oppSpot Streams • Collaborative Deal Flow Management • Confidential
          </Text>
        </View>
      </Page>

      {/* Stream Items by Stage */}
      {Object.entries(itemsByStage).map(([stage, stageItems], pageIndex) => (
        <Page key={stage} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>
            {stage === 'unassigned' ? 'Unassigned Items' : `Stage: ${stage}`}
          </Text>

          {stageItems.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <View style={[styles.badge, getPriorityStyle(item.priority)]}>
                    <Text>{item.priority.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.badge, getStatusStyle(item.status)]}>
                    <Text>{item.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {item.description && (
                <Text style={styles.itemDescription}>{item.description}</Text>
              )}

              <View style={{ marginTop: 5 }}>
                <View style={styles.row}>
                  <Text style={{ fontSize: 8, color: '#64748b' }}>
                    Type: {item.item_type}
                  </Text>
                  <Text style={{ fontSize: 8, color: '#64748b', marginLeft: 10 }}>
                    Progress: {item.completion_percentage}%
                  </Text>
                </View>
                {item.assigned_user && (
                  <Text style={{ fontSize: 8, color: '#64748b' }}>
                    Assigned: {item.assigned_user.full_name}
                  </Text>
                )}
                {item.due_date && (
                  <Text style={{ fontSize: 8, color: '#64748b' }}>
                    Due: {new Date(item.due_date).toLocaleDateString('en-GB')}
                  </Text>
                )}
                {item.businesses && (
                  <Text style={{ fontSize: 8, color: '#64748b' }}>
                    Company: {item.businesses.name}
                  </Text>
                )}
              </View>
            </View>
          ))}

          {stageItems.length > 8 && (
            <Text style={{ marginTop: 10, fontSize: 9, color: '#64748b' }}>
              ... and {stageItems.length - 8} more items in this stage
            </Text>
          )}

          <View style={styles.footer}>
            <Text>Page {pageIndex + 2} • oppSpot Streams</Text>
          </View>
        </Page>
      ))}

      {/* Recent Activity */}
      {activities.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {activities.slice(0, 20).map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <Text style={styles.activityText}>{activity.description}</Text>
              <Text style={styles.activityMeta}>
                {activity.user?.full_name || 'System'} • {new Date(activity.created_at).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          ))}

          {activities.length > 20 && (
            <Text style={{ marginTop: 10, fontSize: 9, color: '#64748b' }}>
              Showing most recent 20 activities (total: {activities.length})
            </Text>
          )}

          <View style={styles.footer}>
            <Text>oppSpot Streams • Activity Log</Text>
          </View>
        </Page>
      )}
    </Document>
  )
}

/**
 * Generate PDF buffer from streams data
 */
export async function generateStreamsPDF(
  data: StreamExportData
): Promise<Buffer> {
  try {
    const buffer = await renderToBuffer(<StreamsPDF data={data} />)
    return buffer
  } catch (error) {
    console.error('[StreamsPDF] Export failed:', error)
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export type { StreamExportData }
