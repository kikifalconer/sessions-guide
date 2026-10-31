import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type InquiryStatus = 'new' | 'read' | 'archived'
export type InquiryBox = 'inbox' | 'archived'

export type InquiryListItem = {
  id: string
  seekerName: string
  preview: string
  sessionLabel: string
  createdAt: string
  status: InquiryStatus
}

export type InquiryDetail = {
  id: string
  seekerName: string
  seekerEmail: string
  message: string
  sessionLabel: string
  createdAt: string
  status: InquiryStatus
}

const GENERAL_QUESTION = 'General question'

type SessionRelation = { name: string } | { name: string }[] | null

type InquiryRow = {
  id: string
  seeker_name: string
  seeker_email?: string
  message: string
  session_type_id: string | null
  status: string
  created_at: string
  session_types: SessionRelation
}

function asStatus(value: string): InquiryStatus {
  if (value === 'new' || value === 'read' || value === 'archived') return value
  return 'read'
}

function sessionName(value: SessionRelation): string | null {
  if (!value) return null
  const row = Array.isArray(value) ? value[0] : value
  const name = row?.name?.trim()
  return name ? name : null
}

function sessionLabel(sessionTypeId: string | null, value: SessionRelation): string {
  if (!sessionTypeId) return GENERAL_QUESTION
  return sessionName(value) ?? 'Session'
}

function preview(message: string): string {
  return message.replace(/\s+/g, ' ').trim()
}

export async function countUnreadInquiries(practitionerId: string): Promise<number> {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('practitioner_id', practitionerId)
    .eq('status', 'new')

  if (error) return 0
  return count ?? 0
}

export async function listInquiries(
  practitionerId: string,
  box: InquiryBox
): Promise<InquiryListItem[]> {
  const admin = createAdminClient()
  const statuses = box === 'archived' ? ['archived'] : ['new', 'read']
  const { data, error } = await admin
    .from('inquiries')
    .select('id, seeker_name, message, session_type_id, status, created_at, session_types ( name )')
    .eq('practitioner_id', practitionerId)
    .in('status', statuses)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as InquiryRow[]).map((row) => ({
    id: row.id,
    seekerName: row.seeker_name,
    preview: preview(row.message),
    sessionLabel: sessionLabel(row.session_type_id, row.session_types),
    createdAt: row.created_at,
    status: asStatus(row.status),
  }))
}

export async function getInquiry(
  practitionerId: string,
  inquiryId: string
): Promise<InquiryDetail | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inquiries')
    .select(
      'id, seeker_name, seeker_email, message, session_type_id, status, created_at, session_types ( name )'
    )
    .eq('id', inquiryId)
    .eq('practitioner_id', practitionerId)
    .maybeSingle()

  if (error || !data) return null

  const row = data as InquiryRow
  return {
    id: row.id,
    seekerName: row.seeker_name,
    seekerEmail: row.seeker_email ?? '',
    message: row.message,
    sessionLabel: sessionLabel(row.session_type_id, row.session_types),
    createdAt: row.created_at,
    status: asStatus(row.status),
  }
}
