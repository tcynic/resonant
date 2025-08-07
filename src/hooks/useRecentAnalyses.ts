import { useQuery } from 'convex/react'
import { ApiUnsafe } from '../../convex/api-unsafe'
import { Id } from '@/convex/_generated/dataModel'
import { LangExtractResult } from '@/lib/types'

export type RecentAnalysis = {
  _id: string
  entryId?: string
  status: string
  createdAt: number
  sentimentScore?: number
  confidenceLevel?: number
  entryContent?: string
  relationshipName?: string
  langExtractData?: LangExtractResult
}

export function useRecentAnalyses(userId: Id<'users'>, limit = 5) {
  const args: { userId: Id<'users'>; limit: number } = { userId, limit }
  const data = useQuery(ApiUnsafe.aiAnalysis.getRecentAnalyses, args) as
    | RecentAnalysis[]
    | undefined

  return data
}
