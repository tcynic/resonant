// User types
export interface User {
  _id: string
  clerkId: string
  name: string
  email: string
  createdAt: number
  preferences?: {
    theme?: 'light' | 'dark'
    notifications?: boolean
    language?: string
  }
}

// Relationship types
export interface Relationship {
  _id: string
  userId: string
  name: string
  type: RelationshipType
  photo?: string
  createdAt: number
  updatedAt: number
}

export type RelationshipType =
  | 'partner'
  | 'family'
  | 'friend'
  | 'colleague'
  | 'other'

export type MoodType =
  | 'happy'
  | 'excited'
  | 'content'
  | 'neutral'
  | 'sad'
  | 'angry'
  | 'frustrated'
  | 'anxious'
  | 'confused'
  | 'grateful'

// Journal Entry types
export interface JournalEntry {
  _id: string
  userId: string
  relationshipId: string
  content: string
  mood?: string
  isPrivate?: boolean
  tags?: string[]
  createdAt: number
  updatedAt: number
}

// Health Score types
export interface HealthScore {
  _id: string
  relationshipId: string
  score: number
  factors: {
    communication: number
    trust: number
    satisfaction: number
  }
  trend?: 'improving' | 'stable' | 'declining'
  calculatedAt: number
}

// Form types for creating/updating
export interface CreateUserData {
  clerkId: string
  name: string
  email: string
}

export interface CreateRelationshipData {
  name: string
  type: RelationshipType
  photo?: string
}

export interface UpdateRelationshipData {
  name?: string
  type?: RelationshipType
  photo?: string
}

export interface CreateJournalEntryData {
  relationshipId: string
  content: string
  mood?: string
  isPrivate?: boolean
  tags?: string[]
}

export interface UpdateJournalEntryData {
  content?: string
  mood?: string
  isPrivate?: boolean
  tags?: string[]
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Convex utility types
export type ConvexId<T extends string> = `${T}_${string}`

// Enhanced search parameters
export interface SearchOptions {
  query?: string
  limit?: number
  offset?: number
}

export interface RelationshipSearchOptions extends SearchOptions {
  type?: RelationshipType
}

export interface JournalEntrySearchOptions extends SearchOptions {
  relationshipId?: string
  startDate?: number
  endDate?: number
  isPrivate?: boolean
  tags?: string[]
}
