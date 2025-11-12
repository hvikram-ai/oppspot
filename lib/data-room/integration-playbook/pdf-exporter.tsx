/**
 * Integration Playbook PDF Exporter
 * Generates professional PDF reports using @react-pdf/renderer
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { IntegrationPlaybookWithDetails } from '@/lib/data-room/types';

// Register fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2', fontWeight: 'bold' },
  ],
});

// PDF Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #2563eb',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    fontSize: 9,
    color: '#64748b',
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 5,
  },
  scoreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  scoreItem: {
    width: '23%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 4,
    border: '1px solid #e2e8f0',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  phaseBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
    borderLeft: '3px solid #2563eb',
  },
  phaseTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  phaseDescription: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 6,
  },
  objectivesList: {
    marginTop: 6,
  },
  objectiveItem: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 3,
    paddingLeft: 10,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderBottom: '1px solid #cbd5e1',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e2e8f0',
    fontSize: 9,
  },
  tableCell: {
    flex: 1,
  },
  tableCellSmall: {
    width: '15%',
  },
  tableCellLarge: {
    width: '40%',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    display: 'inline-block',
  },
  badgeCritical: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeHigh: {
    backgroundColor: '#fed7aa',
    color: '#9a3412',
  },
  badgeMedium: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeLow: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTop: '1px solid #e2e8f0',
    paddingTop: 10,
  },
});

interface PlaybookPDFProps {
  playbook: IntegrationPlaybookWithDetails;
}

export const PlaybookPDFDocument: React.FC<PlaybookPDFProps> = ({ playbook }) => {
  const completionPercentage =
    playbook.total_activities > 0
      ? Math.round((playbook.completed_activities / playbook.total_activities) * 100)
      : 0;

  const synergyRealizationPercentage =
    playbook.total_synergies > 0
      ? Math.round((playbook.realized_synergies / playbook.total_synergies) * 100)
      : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Integration Playbook</Text>
          <Text style={styles.subtitle}>{playbook.playbook_name}</Text>
          <View style={styles.metadata}>
            <Text>Deal Type: {playbook.deal_type}</Text>
            <Text>Generated: {format(new Date(playbook.created_at), 'MMM dd, yyyy')}</Text>
            <Text>Status: {playbook.status}</Text>
          </View>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.scoreCard}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{completionPercentage}%</Text>
              <Text style={styles.scoreLabel}>Activity Completion</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>
                {playbook.completed_activities}/{playbook.total_activities}
              </Text>
              <Text style={styles.scoreLabel}>Activities</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{synergyRealizationPercentage}%</Text>
              <Text style={styles.scoreLabel}>Synergy Realization</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>
                {playbook.risks?.filter((r) => r.status === 'open').length || 0}
              </Text>
              <Text style={styles.scoreLabel}>Open Risks</Text>
            </View>
          </View>

          {playbook.deal_rationale && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
                Deal Rationale
              </Text>
              <Text style={{ fontSize: 9, color: '#475569', lineHeight: 1.5 }}>
                {playbook.deal_rationale}
              </Text>
            </View>
          )}
        </View>

        {/* Integration Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integration Timeline</Text>
          {playbook.phases
            .sort((a, b) => a.phase_order - b.phase_order)
            .map((phase) => (
              <View key={phase.id} style={styles.phaseBox}>
                <Text style={styles.phaseTitle}>{phase.phase_name}</Text>
                {phase.phase_description && (
                  <Text style={styles.phaseDescription}>{phase.phase_description}</Text>
                )}
                {phase.objectives && phase.objectives.length > 0 && (
                  <View style={styles.objectivesList}>
                    {phase.objectives.slice(0, 3).map((objective, idx) => (
                      <Text key={idx} style={styles.objectiveItem}>
                        • {objective}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
        </View>
      </Page>

      {/* Activities Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Integration Activities</Text>
          <Text style={styles.subtitle}>
            {playbook.total_activities} activities across {playbook.workstreams.length} workstreams
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellLarge}>Activity</Text>
            <Text style={styles.tableCellSmall}>Priority</Text>
            <Text style={styles.tableCellSmall}>Status</Text>
            <Text style={styles.tableCellSmall}>Duration</Text>
          </View>
          {playbook.activities.slice(0, 20).map((activity) => (
            <View key={activity.id} style={styles.tableRow}>
              <Text style={styles.tableCellLarge}>{activity.activity_name}</Text>
              <Text style={styles.tableCellSmall}>{activity.priority}</Text>
              <Text style={styles.tableCellSmall}>{activity.status}</Text>
              <Text style={styles.tableCellSmall}>{activity.duration_days} days</Text>
            </View>
          ))}
          {playbook.activities.length > 20 && (
            <View style={styles.tableRow}>
              <Text style={{ fontSize: 9, color: '#64748b', fontStyle: 'italic' }}>
                ... and {playbook.activities.length - 20} more activities
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* Synergies Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Synergy Targets</Text>
          <Text style={styles.subtitle}>
            {formatCurrency(playbook.total_synergies)} total 3-year target
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellLarge}>Synergy</Text>
            <Text style={styles.tableCellSmall}>Type</Text>
            <Text style={styles.tableCellSmall}>Year 1</Text>
            <Text style={styles.tableCellSmall}>Year 2</Text>
            <Text style={styles.tableCellSmall}>Year 3</Text>
          </View>
          {playbook.synergies.map((synergy) => (
            <View key={synergy.id} style={styles.tableRow}>
              <Text style={styles.tableCellLarge}>{synergy.synergy_name}</Text>
              <Text style={styles.tableCellSmall}>{synergy.synergy_type}</Text>
              <Text style={styles.tableCellSmall}>
                {formatCurrency(synergy.year_1_target || 0)}
              </Text>
              <Text style={styles.tableCellSmall}>
                {formatCurrency(synergy.year_2_target || 0)}
              </Text>
              <Text style={styles.tableCellSmall}>
                {formatCurrency(synergy.year_3_target || 0)}
              </Text>
            </View>
          ))}
        </View>
      </Page>

      {/* Risks Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Risk Register</Text>
          <Text style={styles.subtitle}>{playbook.risks.length} identified risks</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellLarge}>Risk</Text>
            <Text style={styles.tableCellSmall}>Category</Text>
            <Text style={styles.tableCellSmall}>Impact</Text>
            <Text style={styles.tableCellSmall}>Probability</Text>
            <Text style={styles.tableCellSmall}>Status</Text>
          </View>
          {playbook.risks.map((risk) => (
            <View key={risk.id} style={styles.tableRow}>
              <Text style={styles.tableCellLarge}>{risk.risk_name}</Text>
              <Text style={styles.tableCellSmall}>{risk.risk_category}</Text>
              <Text style={styles.tableCellSmall}>{risk.impact}</Text>
              <Text style={styles.tableCellSmall}>{risk.probability}</Text>
              <Text style={styles.tableCellSmall}>{risk.status}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* Day 1 Checklist Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Day 1 Checklist</Text>
          <Text style={styles.subtitle}>
            {playbook.day1_checklist.length} critical closing day items
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellLarge}>Item</Text>
            <Text style={styles.tableCellSmall}>Category</Text>
            <Text style={styles.tableCellSmall}>Critical</Text>
            <Text style={styles.tableCellSmall}>Owner</Text>
            <Text style={styles.tableCellSmall}>Status</Text>
          </View>
          {playbook.day1_checklist
            .sort((a, b) => a.item_order - b.item_order)
            .map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.tableCellLarge}>{item.checklist_item}</Text>
                <Text style={styles.tableCellSmall}>{item.category}</Text>
                <Text style={styles.tableCellSmall}>{item.is_critical ? 'Yes' : 'No'}</Text>
                <Text style={styles.tableCellSmall}>{item.responsible_party}</Text>
                <Text style={styles.tableCellSmall}>{item.status}</Text>
              </View>
            ))}
        </View>

        <View style={styles.footer}>
          <Text>
            Generated by oppSpot Integration Playbook Generator • {format(new Date(), 'MMM dd, yyyy HH:mm')}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
