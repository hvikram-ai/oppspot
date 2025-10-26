/**
 * Email Templates for Workflow Notifications
 * HTML templates for workflow notification emails
 */

export interface EmailTemplateData {
  [key: string]: string | number | boolean | null | undefined
}

export class WorkflowEmailTemplates {
  /**
   * Approval Request Email Template
   */
  static approvalRequested(data: {
    approverName: string
    requesterName: string
    title: string
    description?: string
    dataRoomName: string
    expiresAt?: string
    actionUrl: string
  }): string {
    const expiryText = data.expiresAt
      ? `<p style="color: #f59e0b; font-weight: 600; margin: 16px 0;">⏰ Expires: ${new Date(data.expiresAt).toLocaleString()}</p>`
      : ''

    return `
      <h2 style="color: #1f2937; margin-bottom: 16px;">Approval Request</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.approverName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        ${data.requesterName} has requested your approval for:
      </p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">${data.title}</h3>
        ${data.description ? `<p style="margin: 0; color: #6b7280;">${data.description}</p>` : ''}
      </div>
      <p style="color: #4b5563; margin-bottom: 8px;">
        <strong>Data Room:</strong> ${data.dataRoomName}
      </p>
      ${expiryText}
      <p style="color: #4b5563; margin-top: 24px;">
        Please review and make a decision on this request.
      </p>
    `
  }

  /**
   * Approval Reminder Email Template
   */
  static approvalReminder(data: {
    approverName: string
    title: string
    dataRoomName: string
    hoursRemaining: number
    actionUrl: string
  }): string {
    return `
      <h2 style="color: #dc2626; margin-bottom: 16px;">⏰ Approval Deadline Approaching</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.approverName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        This is a reminder that an approval request is expiring soon:
      </p>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #991b1b;">${data.title}</h3>
        <p style="margin: 0; color: #7f1d1d; font-weight: 600;">
          ⏱️ Expires in ${data.hoursRemaining} hour${data.hoursRemaining !== 1 ? 's' : ''}
        </p>
      </div>
      <p style="color: #4b5563; margin-bottom: 8px;">
        <strong>Data Room:</strong> ${data.dataRoomName}
      </p>
      <p style="color: #4b5563; margin-top: 24px;">
        Please review this request urgently to avoid expiration.
      </p>
    `
  }

  /**
   * Approval Decision Email Template
   */
  static approvalDecision(data: {
    requesterName: string
    approverName: string
    title: string
    decision: 'approved' | 'rejected' | 'needs_changes'
    decisionNotes?: string
    dataRoomName: string
    actionUrl: string
  }): string {
    const decisionConfig = {
      approved: {
        color: '#10b981',
        bgColor: '#f0fdf4',
        icon: '✅',
        text: 'Approved'
      },
      rejected: {
        color: '#dc2626',
        bgColor: '#fef2f2',
        icon: '❌',
        text: 'Rejected'
      },
      needs_changes: {
        color: '#f59e0b',
        bgColor: '#fffbeb',
        icon: '⚠️',
        text: 'Changes Requested'
      }
    }[data.decision]

    return `
      <h2 style="color: #1f2937; margin-bottom: 16px;">Approval Decision</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.requesterName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        ${data.approverName} has made a decision on your approval request:
      </p>
      <div style="background: ${decisionConfig.bgColor}; border-left: 4px solid ${decisionConfig.color}; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">${data.title}</h3>
        <p style="margin: 0; color: ${decisionConfig.color}; font-weight: 600; font-size: 18px;">
          ${decisionConfig.icon} ${decisionConfig.text}
        </p>
      </div>
      ${data.decisionNotes ? `
        <div style="background: #f9fafb; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; font-weight: 600; color: #374151;">Notes:</p>
          <p style="margin: 0; color: #6b7280;">"${data.decisionNotes}"</p>
        </div>
      ` : ''}
      <p style="color: #4b5563; margin-bottom: 8px;">
        <strong>Data Room:</strong> ${data.dataRoomName}
      </p>
    `
  }

  /**
   * Task Assigned Email Template
   */
  static taskAssigned(data: {
    assigneeName: string
    assignerName: string
    title: string
    description?: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: string
    dataRoomName: string
    actionUrl: string
  }): string {
    const priorityConfig = {
      urgent: { color: '#dc2626', icon: '🔴', text: 'Urgent' },
      high: { color: '#f59e0b', icon: '🟠', text: 'High' },
      medium: { color: '#eab308', icon: '🟡', text: 'Medium' },
      low: { color: '#9ca3af', icon: '⚪', text: 'Low' }
    }[data.priority]

    return `
      <h2 style="color: #1f2937; margin-bottom: 16px;">New Task Assigned</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.assigneeName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        ${data.assignerName} has assigned you a task:
      </p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <h3 style="margin: 0; color: #1f2937; flex: 1;">${data.title}</h3>
          <span style="background: ${priorityConfig.color}20; color: ${priorityConfig.color}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${priorityConfig.icon} ${priorityConfig.text} Priority
          </span>
        </div>
        ${data.description ? `<p style="margin: 8px 0 0 0; color: #6b7280;">${data.description}</p>` : ''}
      </div>
      <p style="color: #4b5563; margin-bottom: 8px;">
        <strong>Data Room:</strong> ${data.dataRoomName}
      </p>
      ${data.dueDate ? `
        <p style="color: #4b5563; margin-bottom: 8px;">
          <strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}
        </p>
      ` : ''}
    `
  }

  /**
   * Task Due Soon Email Template
   */
  static taskDueSoon(data: {
    assigneeName: string
    title: string
    hoursRemaining: number
    dataRoomName: string
    actionUrl: string
  }): string {
    return `
      <h2 style="color: #f59e0b; margin-bottom: 16px;">⏰ Task Due Soon</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.assigneeName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        This is a reminder that a task assigned to you is due soon:
      </p>
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #78350f;">${data.title}</h3>
        <p style="margin: 0; color: #92400e; font-weight: 600;">
          ⏱️ Due in ${data.hoursRemaining} hour${data.hoursRemaining !== 1 ? 's' : ''}
        </p>
      </div>
      <p style="color: #4b5563; margin-bottom: 8px;">
        <strong>Data Room:</strong> ${data.dataRoomName}
      </p>
    `
  }

  /**
   * Task Overdue Email Template
   */
  static taskOverdue(data: {
    assigneeName: string
    title: string
    daysOverdue: number
    dataRoomName: string
    actionUrl: string
  }): string {
    return `
      <h2 style="color: #dc2626; margin-bottom: 16px;">⚠️ Task Overdue</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.assigneeName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        A task assigned to you is now overdue:
      </p>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #991b1b;">${data.title}</h3>
        <p style="margin: 0; color: #7f1d1d; font-weight: 600;">
          ❌ ${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} overdue
        </p>
      </div>
      <p style="color: #4b5563; margin-bottom: 8px;">
        <strong>Data Room:</strong> ${data.dataRoomName}
      </p>
      <p style="color: #4b5563; margin-top: 24px;">
        Please complete this task as soon as possible.
      </p>
    `
  }

  /**
   * Workflow Started Email Template
   */
  static workflowStarted(data: {
    userName: string
    workflowName: string
    dataRoomName: string
    actionUrl: string
  }): string {
    return `
      <h2 style="color: #1f2937; margin-bottom: 16px;">Workflow Started</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.userName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        A workflow has been started in ${data.dataRoomName}:
      </p>
      <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #1e40af;">🚀 ${data.workflowName}</h3>
      </div>
      <p style="color: #4b5563; margin-top: 24px;">
        You'll receive notifications as tasks and approvals are assigned to you.
      </p>
    `
  }

  /**
   * Workflow Completed Email Template
   */
  static workflowCompleted(data: {
    userName: string
    workflowName: string
    dataRoomName: string
    actionUrl: string
  }): string {
    return `
      <h2 style="color: #10b981; margin-bottom: 16px;">🎉 Workflow Completed</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.userName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        Great news! A workflow has been completed in ${data.dataRoomName}:
      </p>
      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #065f46;">✅ ${data.workflowName}</h3>
      </div>
      <p style="color: #4b5563; margin-top: 24px;">
        All steps have been completed successfully.
      </p>
    `
  }

  /**
   * Document Uploaded Email Template
   */
  static documentUploaded(data: {
    userName: string
    documentName: string
    uploaderName: string
    dataRoomName: string
    actionUrl: string
  }): string {
    return `
      <h2 style="color: #1f2937; margin-bottom: 16px;">New Document Uploaded</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.userName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        ${data.uploaderName} has uploaded a new document to ${data.dataRoomName}:
      </p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #1f2937;">📄 ${data.documentName}</h3>
      </div>
    `
  }

  /**
   * Document Analyzed Email Template
   */
  static documentAnalyzed(data: {
    userName: string
    documentName: string
    documentType: string
    dataRoomName: string
    actionUrl: string
  }): string {
    return `
      <h2 style="color: #1f2937; margin-bottom: 16px;">Document Analysis Complete</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.userName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        Your document has been analyzed by AI:
      </p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">📄 ${data.documentName}</h3>
        <p style="margin: 0; color: #6b7280;">
          <strong>Classification:</strong> ${data.documentType}
        </p>
      </div>
      <p style="color: #4b5563; margin-bottom: 8px;">
        <strong>Data Room:</strong> ${data.dataRoomName}
      </p>
      <p style="color: #4b5563; margin-top: 24px;">
        View the document to see extracted metadata and AI insights.
      </p>
    `
  }

  /**
   * Member Invited Email Template
   */
  static memberInvited(data: {
    inviteeName: string
    inviterName: string
    dataRoomName: string
    role: string
    inviteToken: string
    actionUrl: string
  }): string {
    return `
      <h2 style="color: #1f2937; margin-bottom: 16px;">Data Room Invitation</h2>
      <p style="color: #4b5563; margin-bottom: 12px;">Hi ${data.inviteeName},</p>
      <p style="color: #4b5563; margin-bottom: 16px;">
        ${data.inviterName} has invited you to collaborate on a data room:
      </p>
      <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #1e40af;">📁 ${data.dataRoomName}</h3>
        <p style="margin: 0; color: #1e3a8a;">
          <strong>Your Role:</strong> ${data.role}
        </p>
      </div>
      <p style="color: #4b5563; margin-top: 24px;">
        Click the button below to accept the invitation and access the data room.
      </p>
    `
  }
}
