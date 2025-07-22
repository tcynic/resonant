'use client'

import { useRouter } from 'next/navigation'
import JournalEntriesList from '@/components/features/journal/journal-entries-list'
import ErrorBoundary, {
  NetworkErrorFallback,
} from '@/components/ui/error-boundary'

export default function JournalPage() {
  const router = useRouter()

  const handleCreateNew = () => {
    router.push('/journal/new')
  }

  const handleView = (entryId: string) => {
    router.push(`/journal/${entryId}`)
  }

  const handleEdit = (entryId: string) => {
    router.push(`/journal/${entryId}/edit`)
  }

  const handleDelete = () => {
    // Refresh the page to reload entries after deletion
    router.refresh()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <ErrorBoundary
        fallback={
          <NetworkErrorFallback onRetry={() => window.location.reload()} />
        }
      >
        <JournalEntriesList
          onCreateNew={handleCreateNew}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </ErrorBoundary>
    </div>
  )
}
