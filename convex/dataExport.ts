import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { ConvexError } from 'convex/values'
import { Id } from './_generated/dataModel'

// Export user's complete data in JSON format
export const exportUserData = query({
  args: {
    userId: v.id('users'),
    format: v.optional(v.union(v.literal('json'), v.literal('csv'))),
    includeAnalysis: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, format = 'json', includeAnalysis = false } = args

    // Verify user exists
    const user = await ctx.db.get(userId)
    if (!user) {
      throw new ConvexError('User not found')
    }

    try {
      // Get user's relationships
      const relationships = await ctx.db
        .query('relationships')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect()

      // Get user's journal entries
      const journalEntries = await ctx.db
        .query('journalEntries')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect()

      // Get health scores if requested
      let healthScores: any[] = []
      if (includeAnalysis) {
        healthScores = await ctx.db
          .query('healthScores')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect()
      }

      // Get AI analysis if requested
      let aiAnalysis: any[] = []
      if (includeAnalysis) {
        aiAnalysis = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect()
      }

      // Create relationship lookup map for easier access
      const relationshipMap = new Map(relationships.map(rel => [rel._id, rel]))

      // Prepare export data
      const exportData = {
        exportMetadata: {
          exportDate: new Date().toISOString(),
          exportVersion: '1.0',
          dataTypes: [
            'user',
            'relationships',
            'journalEntries',
            ...(includeAnalysis ? ['healthScores', 'aiAnalysis'] : []),
          ],
          totalRecords: {
            relationships: relationships.length,
            journalEntries: journalEntries.length,
            ...(includeAnalysis
              ? {
                  healthScores: healthScores.length,
                  aiAnalysis: aiAnalysis.length,
                }
              : {}),
          },
        },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: new Date(user.createdAt).toISOString(),
          preferences: user.preferences || {},
        },
        relationships: relationships.map(rel => ({
          id: rel._id,
          name: rel.name,
          type: rel.type,
          photo: rel.photo,
          createdAt: new Date(rel.createdAt).toISOString(),
          updatedAt: new Date(rel.updatedAt).toISOString(),
        })),
        journalEntries: journalEntries.map(entry => {
          const relationship = relationshipMap.get(entry.relationshipId)
          return {
            id: entry._id,
            content: entry.content,
            mood: entry.mood,
            tags: entry.tags || [],
            isPrivate: entry.isPrivate || false,
            createdAt: new Date(entry.createdAt).toISOString(),
            updatedAt: new Date(entry.updatedAt).toISOString(),
            relationship: relationship
              ? {
                  id: relationship._id,
                  name: relationship.name,
                  type: relationship.type,
                }
              : null,
          }
        }),
        ...(includeAnalysis
          ? {
              healthScores: healthScores.map(score => ({
                id: score._id,
                relationshipId: score.relationshipId,
                overallScore: score.overallScore,
                componentScores: score.componentScores,
                lastUpdated: new Date(score.lastUpdated).toISOString(),
                dataPoints: score.dataPoints,
                confidenceLevel: score.confidenceLevel,
                trendsData: score.trendsData,
              })),
              aiAnalysis: aiAnalysis.map(analysis => ({
                id: analysis._id,
                journalEntryId: analysis.journalEntryId,
                relationshipId: analysis.relationshipId,
                analysisType: analysis.analysisType,
                analysisResults: {
                  sentimentScore: analysis.analysisResults.sentimentScore,
                  emotions: analysis.analysisResults.emotions,
                  confidence: analysis.analysisResults.confidence,
                },
                createdAt: new Date(analysis.createdAt).toISOString(),
              })),
            }
          : {}),
      }

      return {
        data: exportData,
        format,
        fileName: `resonant-export-${user.name?.toLowerCase().replace(/\s+/g, '-') || 'user'}-${new Date().toISOString().split('T')[0]}.${format}`,
        size: JSON.stringify(exportData).length,
      }
    } catch (error) {
      console.error('Data export failed:', error)
      throw new ConvexError('Failed to export user data')
    }
  },
})

// Get export statistics (for showing user what will be exported)
export const getExportStatistics = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const { userId } = args

    // Verify user exists
    const user = await ctx.db.get(userId)
    if (!user) {
      throw new ConvexError('User not found')
    }

    try {
      // Get counts for each data type
      const relationshipsCount = await ctx.db
        .query('relationships')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect()
        .then(results => results.length)

      const journalEntriesCount = await ctx.db
        .query('journalEntries')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect()
        .then(results => results.length)

      const healthScoresCount = await ctx.db
        .query('healthScores')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect()
        .then(results => results.length)

      const aiAnalysisCount = await ctx.db
        .query('aiAnalysis')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect()
        .then(results => results.length)

      // Get date range of data
      const firstEntry = await ctx.db
        .query('journalEntries')
        .withIndex('by_user_created', q => q.eq('userId', userId))
        .order('asc')
        .first()

      const lastEntry = await ctx.db
        .query('journalEntries')
        .withIndex('by_user_created', q => q.eq('userId', userId))
        .order('desc')
        .first()

      return {
        userId: userId,
        userName: user.name,
        userEmail: user.email,
        accountCreated: new Date(user.createdAt).toISOString(),
        statistics: {
          relationships: relationshipsCount,
          journalEntries: journalEntriesCount,
          healthScores: healthScoresCount,
          aiAnalysis: aiAnalysisCount,
        },
        dateRange: {
          firstEntry: firstEntry
            ? new Date(firstEntry.createdAt).toISOString()
            : null,
          lastEntry: lastEntry
            ? new Date(lastEntry.createdAt).toISOString()
            : null,
        },
        estimatedSize: {
          jsonMB:
            Math.round(
              (relationshipsCount * 0.5 +
                journalEntriesCount * 2 +
                healthScoresCount * 1 +
                aiAnalysisCount * 0.8) /
                100
            ) / 10,
          recordCount:
            relationshipsCount +
            journalEntriesCount +
            healthScoresCount +
            aiAnalysisCount,
        },
      }
    } catch (error) {
      console.error('Failed to get export statistics:', error)
      throw new ConvexError('Failed to get export statistics')
    }
  },
})

// Create export job (for large datasets that need background processing)
export const createExportJob = mutation({
  args: {
    userId: v.id('users'),
    format: v.union(v.literal('json'), v.literal('csv')),
    includeAnalysis: v.boolean(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, format, includeAnalysis, email } = args

    // Verify user exists
    const user = await ctx.db.get(userId)
    if (!user) {
      throw new ConvexError('User not found')
    }

    // Verify email matches user
    if (user.email !== email) {
      throw new ConvexError('Email mismatch')
    }

    try {
      // For now, we'll implement direct export
      // In production, you might want to queue this for background processing

      // Get user's relationships
      const relationships = await ctx.db
        .query('relationships')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect()

      // Get user's journal entries
      const journalEntries = await ctx.db
        .query('journalEntries')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect()

      // Get health scores if requested
      let healthScores: any[] = []
      if (includeAnalysis) {
        healthScores = await ctx.db
          .query('healthScores')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect()
      }

      // Get AI analysis if requested
      let aiAnalysis: any[] = []
      if (includeAnalysis) {
        aiAnalysis = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect()
      }

      // Create export data structure
      const exportData = {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        relationships: relationships.map(rel => ({
          id: rel._id,
          name: rel.name,
          type: rel.type,
          photo: rel.photo,
          createdAt: rel.createdAt,
          updatedAt: rel.updatedAt,
        })),
        journalEntries: journalEntries.map(entry => ({
          id: entry._id,
          relationshipId: entry.relationshipId,
          content: entry.content,
          mood: entry.mood,
          tags: entry.tags || [],
          isPrivate: entry.isPrivate || false,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        })),
        ...(includeAnalysis && {
          healthScores: healthScores.map(score => ({
            id: score._id,
            relationshipId: score.relationshipId,
            overallScore: score.overallScore,
            componentScores: score.componentScores,
            lastUpdated: score.lastUpdated,
            dataPoints: score.dataPoints,
            confidenceLevel: score.confidenceLevel,
            trendsData: score.trendsData,
          })),
          aiAnalysis: aiAnalysis.map(analysis => ({
            id: analysis._id,
            journalEntryId: analysis.journalEntryId,
            relationshipId: analysis.relationshipId,
            analysisType: analysis.analysisType,
            analysisResults: analysis.analysisResults,
            metadata: analysis.metadata,
            createdAt: analysis.createdAt,
            updatedAt: analysis.updatedAt,
          })),
        }),
        exportMetadata: {
          format,
          includeAnalysis,
          exportedAt: Date.now(),
          version: '1.0',
        },
      }

      const exportDataString = JSON.stringify(exportData)
      const exportResult = {
        data: exportData,
        format,
        fileName: `resonant-export-${format}-${new Date().toISOString().split('T')[0]}.${format}`,
        size: new TextEncoder().encode(exportDataString).length,
      }

      return {
        jobId: `export_${userId}_${Date.now()}`,
        status: 'completed',
        downloadUrl: null, // Would be implemented with file storage service
        data: exportResult.data, // Return data directly for now
        format: exportResult.format,
        fileName: exportResult.fileName,
        size: exportResult.size,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      }
    } catch (error) {
      console.error('Export job failed:', error)
      throw new ConvexError('Failed to create export job')
    }
  },
})

// Helper function to convert data to CSV format
export const convertToCSV = query({
  args: {
    userId: v.id('users'),
    dataType: v.union(
      v.literal('relationships'),
      v.literal('journalEntries'),
      v.literal('healthScores')
    ),
  },
  handler: async (ctx, args) => {
    const { userId, dataType } = args

    // Verify user exists
    const user = await ctx.db.get(userId)
    if (!user) {
      throw new ConvexError('User not found')
    }

    try {
      let csvContent = ''
      let fileName = ''

      switch (dataType) {
        case 'relationships':
          const relationships = await ctx.db
            .query('relationships')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect()

          csvContent = [
            'ID,Name,Type,Created,Updated',
            ...relationships.map(
              rel =>
                `"${rel._id}","${rel.name}","${rel.type}","${new Date(rel.createdAt).toISOString()}","${new Date(rel.updatedAt).toISOString()}"`
            ),
          ].join('\n')
          fileName = 'relationships.csv'
          break

        case 'journalEntries':
          const entries = await ctx.db
            .query('journalEntries')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect()

          // Get relationships for lookup
          const relationshipMap = new Map(
            (
              await ctx.db
                .query('relationships')
                .withIndex('by_user', q => q.eq('userId', userId))
                .collect()
            ).map(rel => [rel._id, rel])
          )

          csvContent = [
            'ID,Content,Relationship,Mood,Tags,Private,Created,Updated',
            ...entries.map(entry => {
              const relationship = relationshipMap.get(entry.relationshipId)
              const contentSafe = entry.content
                .replace(/"/g, '""')
                .replace(/\n/g, ' ')
              const tags = (entry.tags || []).join(';')
              return `"${entry._id}","${contentSafe}","${relationship?.name || 'Unknown'}","${entry.mood || ''}","${tags}","${entry.isPrivate || false}","${new Date(entry.createdAt).toISOString()}","${new Date(entry.updatedAt).toISOString()}"`
            }),
          ].join('\n')
          fileName = 'journal-entries.csv'
          break

        case 'healthScores':
          const scores = await ctx.db
            .query('healthScores')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect()

          csvContent = [
            'ID,Relationship,Overall Score,Sentiment,Emotional Stability,Energy Impact,Conflict Resolution,Gratitude,Communication Frequency,Last Updated,Data Points,Confidence',
            ...scores.map(
              score =>
                `"${score._id}","${score.relationshipId}","${score.overallScore}","${score.componentScores.sentiment}","${score.componentScores.emotionalStability}","${score.componentScores.energyImpact}","${score.componentScores.conflictResolution}","${score.componentScores.gratitude}","${score.componentScores.communicationFrequency}","${new Date(score.lastUpdated).toISOString()}","${score.dataPoints}","${score.confidenceLevel}"`
            ),
          ].join('\n')
          fileName = 'health-scores.csv'
          break

        default:
          throw new ConvexError('Invalid data type for CSV conversion')
      }

      return {
        content: csvContent,
        fileName,
        size: csvContent.length,
        recordCount: csvContent.split('\n').length - 1, // Subtract header row
      }
    } catch (error) {
      console.error('CSV conversion failed:', error)
      throw new ConvexError('Failed to convert data to CSV')
    }
  },
})
