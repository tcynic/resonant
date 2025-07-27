# Usage Examples & Best Practices

## Overview

This document provides comprehensive real-world usage examples and best practices for implementing the Resonant design system. It covers common patterns, anti-patterns, performance optimization, and migration strategies to ensure consistent and effective use across the application.

## Component Usage Patterns

### Layout and Structure

#### Application Shell Pattern

```tsx
// src/components/layout/app-shell.tsx
import { Sidebar } from '@/components/navigation/sidebar';
import { Header } from '@/components/navigation/header';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/toaster';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="resonant-theme">
      <div className="flex h-screen bg-background text-foreground">
        {/* Sidebar navigation */}
        <Sidebar className="hidden w-64 border-r border-border lg:block" />
        
        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
      
      {/* Global toast notifications */}
      <Toaster />
    </ThemeProvider>
  );
}

// Usage in app
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
```

#### Responsive Grid Layouts

```tsx
// Responsive grid using design system patterns
export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

// Dashboard card grid example
export function DashboardGrid() {
  return (
    <div className="space-y-8">
      {/* Key metrics */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="text-2xl font-semibold text-foreground mb-6">
          Key Metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total Entries" value="247" change="+12%" />
          <MetricCard title="Health Score" value="8.2" change="+0.3" />
          <MetricCard title="Relationships" value="5" change="0" />
          <MetricCard title="Insights" value="18" change="+3" />
        </div>
      </section>
      
      {/* Charts section */}
      <section aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="text-2xl font-semibold text-foreground mb-6">
          Analytics
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Mood Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={moodData} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Relationship Health</CardTitle>
            </CardHeader>
            <CardContent>
              <HealthChart data={healthData} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
```

### Form Patterns

#### Comprehensive Form Example

```tsx
// Journal entry form with validation and accessibility
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const journalEntrySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be under 100 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  mood: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed'),
  relationships: z.array(z.string()).optional(),
  privacy: z.enum(['private', 'shared', 'public']).default('private'),
});

type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

export function JournalEntryForm({ 
  initialData, 
  onSubmit, 
  onCancel 
}: JournalEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: initialData,
  });

  const onFormSubmit = async (data: JournalEntryFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Journal Entry' : 'New Journal Entry'}
        </CardTitle>
        <CardDescription>
          Share your thoughts and feelings. Your entry will be {watch('privacy')} by default.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Title field */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title
              <span className="text-destructive ml-1" aria-label="required">*</span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="What's on your mind?"
              aria-invalid={errors.title ? 'true' : undefined}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            {errors.title && (
              <p id="title-error" role="alert" className="text-sm text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Content field */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Content
              <span className="text-destructive ml-1" aria-label="required">*</span>
            </Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder="Write about your day, feelings, or thoughts..."
              className="min-h-32"
              aria-invalid={errors.content ? 'true' : undefined}
              aria-describedby={errors.content ? 'content-error' : undefined}
            />
            {errors.content && (
              <p id="content-error" role="alert" className="text-sm text-destructive">
                {errors.content.message}
              </p>
            )}
          </div>

          {/* Mood selector */}
          <div className="space-y-3">
            <Label>
              Mood
              <span className="text-destructive ml-1" aria-label="required">*</span>
            </Label>
            <RadioGroup
              value={watch('mood')}
              onValueChange={(value) => setValue('mood', value as any)}
              className="flex flex-wrap gap-4"
            >
              {moodOptions.map((mood) => (
                <div key={mood.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={mood.value}
                    id={mood.value}
                    aria-describedby={`${mood.value}-description`}
                  />
                  <Label
                    htmlFor={mood.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <span className="text-lg">{mood.emoji}</span>
                    <span>{mood.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {errors.mood && (
              <p role="alert" className="text-sm text-destructive">
                {errors.mood.message}
              </p>
            )}
          </div>

          {/* Tags input */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <TagInput
              value={selectedTags}
              onChange={(tags) => {
                setSelectedTags(tags);
                setValue('tags', tags);
              }}
              placeholder="Add tags to organize your entries..."
              maxTags={10}
            />
            {errors.tags && (
              <p role="alert" className="text-sm text-destructive">
                {errors.tags.message}
              </p>
            )}
          </div>

          {/* Relationships selector */}
          <div className="space-y-2">
            <Label htmlFor="relationships">Related Relationships</Label>
            <RelationshipMultiSelect
              value={watch('relationships') || []}
              onChange={(relationships) => setValue('relationships', relationships)}
              placeholder="Select relationships this entry relates to..."
            />
          </div>

          {/* Privacy settings */}
          <div className="space-y-3">
            <Label>Privacy</Label>
            <RadioGroup
              value={watch('privacy')}
              onValueChange={(value) => setValue('privacy', value as any)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex items-center space-x-2 cursor-pointer">
                  <LockIcon className="h-4 w-4" />
                  <div>
                    <div>Private</div>
                    <div className="text-sm text-muted-foreground">Only you can see this entry</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="shared" id="shared" />
                <Label htmlFor="shared" className="flex items-center space-x-2 cursor-pointer">
                  <UsersIcon className="h-4 w-4" />
                  <div>
                    <div>Shared</div>
                    <div className="text-sm text-muted-foreground">Share with selected relationships</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Form actions */}
          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              className="flex-1"
            >
              {initialData ? 'Update Entry' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

#### Form Validation Patterns

```tsx
// Reusable form field component with validation
export function FormField({
  label,
  description,
  error,
  required = false,
  children,
}: FormFieldProps) {
  const fieldId = useId();
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">*</span>
        )}
      </Label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {React.cloneElement(children, {
        id: fieldId,
        'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required,
      })}
      
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// Usage with validation
export function ValidatedForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Email Address"
        description="We'll never share your email address"
        error={errors.email?.message}
        required
      >
        <Input
          type="email"
          placeholder="you@example.com"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
        />
      </FormField>
      
      <FormField
        label="Password"
        error={errors.password?.message}
        required
      >
        <Input
          type="password"
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
          })}
        />
      </FormField>
    </form>
  );
}
```

### Data Display Patterns

#### Table with Actions

```tsx
// Feature-rich data table with sorting, filtering, and actions
export function JournalEntriesTable({ entries, onEdit, onDelete }: TableProps) {
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterMood, setFilterMood] = useState<string>('all');
  
  const sortedAndFilteredEntries = useMemo(() => {
    let filtered = entries;
    
    if (filterMood !== 'all') {
      filtered = entries.filter(entry => entry.mood === filterMood);
    }
    
    return filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [entries, sortColumn, sortDirection, filterMood]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Journal Entries</CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="mood-filter" className="sr-only">Filter by mood</Label>
            <Select value={filterMood} onValueChange={setFilterMood}>
              <SelectTrigger id="mood-filter" className="w-40">
                <SelectValue placeholder="Filter by mood" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Moods</SelectItem>
                <SelectItem value="very_positive">Very Positive</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="very_negative">Very Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <caption className="sr-only">
              Journal entries table with {sortedAndFilteredEntries.length} entries.
              Sorted by {sortColumn} {sortDirection}.
            </caption>
            
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-3 text-left">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('title')}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    aria-label={`Sort by title ${sortColumn === 'title' && sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    Title
                    {sortColumn === 'title' && (
                      <span className="ml-1" aria-hidden="true">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </Button>
                </th>
                
                <th scope="col" className="px-4 py-3 text-left">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('mood')}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    aria-label={`Sort by mood ${sortColumn === 'mood' && sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    Mood
                    {sortColumn === 'mood' && (
                      <span className="ml-1" aria-hidden="true">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </Button>
                </th>
                
                <th scope="col" className="px-4 py-3 text-left">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('createdAt')}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    aria-label={`Sort by date ${sortColumn === 'createdAt' && sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    Date
                    {sortColumn === 'createdAt' && (
                      <span className="ml-1" aria-hidden="true">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </Button>
                </th>
                
                <th scope="col" className="px-4 py-3 text-left">
                  <span className="font-medium">Actions</span>
                </th>
              </tr>
            </thead>
            
            <tbody>
              {sortedAndFilteredEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-border hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-foreground">{entry.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {entry.content.slice(0, 100)}...
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <span>{getMoodEmoji(entry.mood)}</span>
                      <span>{getMoodLabel(entry.mood)}</span>
                    </Badge>
                  </td>
                  
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(entry)}
                        aria-label={`Edit ${entry.title}`}
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${entry.title}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{entry.title}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(entry.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {sortedAndFilteredEntries.length === 0 && (
            <div className="py-12 text-center">
              <div className="text-muted-foreground">
                {filterMood === 'all' 
                  ? 'No journal entries found.' 
                  : `No entries found with ${getMoodLabel(filterMood)} mood.`
                }
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Loading and Empty States

```tsx
// Comprehensive loading and empty state patterns
export function LoadingStates() {
  return (
    <div className="space-y-8">
      {/* Skeleton loading for cards */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Card Loading State</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      
      {/* Table loading state */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Table Loading State</h3>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/5" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export function EmptyStates() {
  return (
    <div className="space-y-8">
      {/* No data empty state */}
      <EmptyState
        icon={<FileTextIcon className="h-12 w-12 text-muted-foreground" />}
        title="No journal entries yet"
        description="Start documenting your thoughts and feelings by creating your first journal entry."
        action={
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Entry
          </Button>
        }
      />
      
      {/* Search results empty state */}
      <EmptyState
        icon={<SearchIcon className="h-12 w-12 text-muted-foreground" />}
        title="No results found"
        description="Try adjusting your search terms or filters to find what you're looking for."
        action={
          <Button variant="outline">
            Clear Filters
          </Button>
        }
      />
      
      {/* Error state */}
      <EmptyState
        icon={<AlertTriangleIcon className="h-12 w-12 text-destructive" />}
        title="Unable to load entries"
        description="We're having trouble loading your journal entries. Please try again."
        action={
          <Button variant="outline">
            <RefreshIcon className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        }
      />
    </div>
  );
}

// Reusable empty state component
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
```

## Performance Optimization

### Component Optimization Patterns

```tsx
// Optimized list component with virtualization
import { FixedSizeList as List } from 'react-window';

export function VirtualizedJournalList({ entries }: { entries: JournalEntry[] }) {
  const Row = useCallback(({ index, style }: { index: number; style: CSSProperties }) => {
    const entry = entries[index];
    
    return (
      <div style={style} className="px-4">
        <JournalEntryCard entry={entry} />
      </div>
    );
  }, [entries]);

  return (
    <List
      height={600}
      itemCount={entries.length}
      itemSize={120}
      className="border border-border rounded-lg"
    >
      {Row}
    </List>
  );
}

// Memoized component for expensive renders
export const JournalEntryCard = memo(function JournalEntryCard({
  entry,
  onEdit,
  onDelete,
}: JournalEntryCardProps) {
  const formattedDate = useMemo(() => 
    formatDate(entry.createdAt), 
    [entry.createdAt]
  );
  
  const moodData = useMemo(() => 
    getMoodData(entry.mood), 
    [entry.mood]
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-1">{entry.title}</CardTitle>
          <Badge variant="outline" className="ml-2">
            <span className="mr-1">{moodData.emoji}</span>
            {moodData.label}
          </Badge>
        </div>
        <CardDescription>{formattedDate}</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {entry.content}
        </p>
        
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {entry.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {entry.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{entry.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(entry)}>
            <EditIcon className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(entry.id)}>
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});

// Lazy loaded components for code splitting
const ChartSection = lazy(() => import('@/components/features/charts/chart-section'));
const AnalyticsPanel = lazy(() => import('@/components/features/analytics/analytics-panel'));

export function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Critical above-the-fold content */}
      <DashboardHeader />
      <KeyMetrics />
      
      {/* Lazy loaded components */}
      <Suspense fallback={<ChartSkeleton />}>
        <ChartSection />
      </Suspense>
      
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsPanel />
      </Suspense>
    </div>
  );
}
```

### Image and Asset Optimization

```tsx
// Optimized image component with lazy loading
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  ...props
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('transition-opacity duration-300', className)}
      priority={priority}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyuwjtnxvvx/wAnE8f30Tnf1sJtixlsdrOW2vDSa7L/AL3j/9k="
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      {...props}
    />
  );
}

// Avatar component with fallbacks
export function UserAvatar({
  user,
  size = 'md',
  className,
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const initials = useMemo(() => {
    if (!user.name) return user.email?.[0]?.toUpperCase() || '?';
    
    return user.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [user.name, user.email]);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage
        src={user.avatar}
        alt={`${user.name || user.email} avatar`}
      />
      <AvatarFallback className="bg-muted">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
```

## Common Anti-Patterns to Avoid

### ❌ Poor Accessibility

```tsx
// BAD: Missing accessibility attributes
<div onClick={handleClick} className="button-like">
  Click me
</div>

// BAD: No keyboard support
<div onClick={handleSubmit}>Submit</div>

// BAD: Color-only information
<span className="text-red-500">Error</span>
<span className="text-green-500">Success</span>
```

### ✅ Good Accessibility

```tsx
// GOOD: Proper button element with accessibility
<Button
  onClick={handleClick}
  aria-label="Close dialog"
  aria-expanded="false"
>
  Click me
</Button>

// GOOD: Keyboard and screen reader support
<Button
  type="submit"
  onClick={handleSubmit}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleSubmit();
    }
  }}
>
  Submit
</Button>

// GOOD: Icon and text for status
<div className="flex items-center gap-2">
  <AlertCircleIcon className="h-4 w-4 text-destructive" />
  <span className="text-destructive">Error occurred</span>
</div>
```

### ❌ Poor Performance

```tsx
// BAD: Inline styles and unnecessary re-renders
const BadComponent = ({ items }) => {
  return (
    <div>
      {items.map(item => (
        <div
          key={item.id}
          style={{ padding: '16px', margin: '8px' }}
          onClick={() => console.log(item.id)}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
};

// BAD: Missing memoization for expensive operations
const BadChart = ({ data }) => {
  const processedData = data.map(item => ({
    ...item,
    computed: expensiveCalculation(item),
  }));
  
  return <Chart data={processedData} />;
};
```

### ✅ Good Performance

```tsx
// GOOD: CSS classes and proper memoization
const GoodComponent = memo(({ items }) => {
  const handleClick = useCallback((id: string) => {
    console.log(id);
  }, []);

  return (
    <div>
      {items.map(item => (
        <div
          key={item.id}
          className="p-4 m-2 hover:bg-accent rounded-md cursor-pointer"
          onClick={() => handleClick(item.id)}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
});

// GOOD: Memoized expensive calculations
const GoodChart = ({ data }) => {
  const processedData = useMemo(() => 
    data.map(item => ({
      ...item,
      computed: expensiveCalculation(item),
    })), 
    [data]
  );
  
  return <Chart data={processedData} />;
};
```

### ❌ Poor Component Design

```tsx
// BAD: Monolithic component with multiple responsibilities
const BadUserProfile = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(user);
  
  const handleSave = async () => {
    // API call logic
    // Validation logic
    // Toast notifications
    // State management
  };

  return (
    <div>
      {/* Avatar upload */}
      {/* Personal information form */}
      {/* Security settings */}
      {/* Notification preferences */}
      {/* Account deletion */}
    </div>
  );
};
```

### ✅ Good Component Design

```tsx
// GOOD: Composed components with single responsibilities
const GoodUserProfile = ({ user }) => {
  return (
    <div className="space-y-8">
      <UserProfileHeader user={user} />
      <UserPersonalInfo user={user} />
      <UserSecuritySettings user={user} />
      <UserNotificationPreferences user={user} />
      <UserAccountDeletion user={user} />
    </div>
  );
};

// Each component handles its own state and logic
const UserPersonalInfo = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { updateUser, isLoading } = useUpdateUser();
  
  const handleSave = async (data) => {
    await updateUser(data);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <PersonalInfoForm user={user} onSave={handleSave} onCancel={() => setIsEditing(false)} />
        ) : (
          <PersonalInfoDisplay user={user} onEdit={() => setIsEditing(true)} />
        )}
      </CardContent>
    </Card>
  );
};
```

## Migration Strategies

### Gradual Component Adoption

```tsx
// Phase 1: Wrapper approach for existing components
const LegacyButtonWrapper = ({ children, ...props }) => {
  return (
    <Button variant="outline" {...props}>
      {children}
    </Button>
  );
};

// Phase 2: Progressive enhancement
const EnhancedButton = ({ legacy = false, ...props }) => {
  if (legacy) {
    return <LegacyButtonWrapper {...props} />;
  }
  
  return <Button {...props} />;
};

// Phase 3: Full migration with deprecation warnings
const MigratedButton = ({ deprecated, ...props }) => {
  useEffect(() => {
    if (deprecated) {
      console.warn('This button usage is deprecated. Please migrate to the new API.');
    }
  }, [deprecated]);
  
  return <Button {...props} />;
};
```

### CSS-in-JS to Tailwind Migration

```tsx
// Before: styled-components
const StyledCard = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 24px;
  margin-bottom: 16px;
`;

// During: Hybrid approach
const HybridCard = ({ useNewStyles = false, children, ...props }) => {
  if (useNewStyles) {
    return (
      <Card className="mb-4" {...props}>
        <CardContent className="p-6">
          {children}
        </CardContent>
      </Card>
    );
  }
  
  return <StyledCard {...props}>{children}</StyledCard>;
};

// After: Pure design system
const ModernCard = ({ children, ...props }) => {
  return (
    <Card className="mb-4" {...props}>
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  );
};
```

### Component API Evolution

```tsx
// Version 1: Basic component
interface ButtonV1Props {
  onClick: () => void;
  children: React.ReactNode;
  type?: 'primary' | 'secondary';
}

// Version 2: Enhanced with new props (backward compatible)
interface ButtonV2Props extends ButtonV1Props {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  // Map old type prop to new variant
  type?: 'primary' | 'secondary';
}

const ButtonV2 = ({ type, variant, ...props }: ButtonV2Props) => {
  // Handle legacy prop mapping
  const mappedVariant = variant || (type === 'primary' ? 'default' : 'secondary');
  
  return <Button variant={mappedVariant} {...props} />;
};

// Version 3: Remove deprecated props
interface ButtonV3Props {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}
```

## Testing Best Practices

### Component Testing Examples

```tsx
// Comprehensive component testing
describe('JournalEntryCard', () => {
  const mockEntry: JournalEntry = {
    id: '1',
    title: 'Test Entry',
    content: 'This is a test journal entry with some content.',
    mood: 'positive',
    tags: ['test', 'example'],
    createdAt: new Date('2025-01-15'),
  };

  it('renders entry information correctly', () => {
    render(<JournalEntryCard entry={mockEntry} />);
    
    expect(screen.getByText('Test Entry')).toBeInTheDocument();
    expect(screen.getByText(/This is a test journal entry/)).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('example')).toBeInTheDocument();
  });

  it('handles edit action', async () => {
    const onEdit = jest.fn();
    render(<JournalEntryCard entry={mockEntry} onEdit={onEdit} />);
    
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(mockEntry);
  });

  it('handles delete action with confirmation', async () => {
    const onDelete = jest.fn();
    render(<JournalEntryCard entry={mockEntry} onDelete={onDelete} />);
    
    // Click delete button
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    
    // Confirm deletion in dialog
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    
    expect(onDelete).toHaveBeenCalledWith(mockEntry.id);
  });

  it('truncates long content', () => {
    const longEntry = {
      ...mockEntry,
      content: 'This is a very long journal entry that should be truncated after a certain number of characters to maintain consistent card sizing and layout.',
    };
    
    render(<JournalEntryCard entry={longEntry} />);
    
    const contentElement = screen.getByText(/This is a very long journal entry/);
    expect(contentElement).toHaveClass('line-clamp-2');
  });

  it('meets accessibility requirements', async () => {
    const { container } = render(<JournalEntryCard entry={mockEntry} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Integration Testing

```tsx
// Integration test for form submission flow
describe('Journal Entry Creation Flow', () => {
  it('creates a new journal entry successfully', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true });
    
    render(<JournalEntryForm onSubmit={mockSubmit} />);
    
    // Fill out form
    await userEvent.type(screen.getByLabelText(/title/i), 'My Test Entry');
    await userEvent.type(screen.getByLabelText(/content/i), 'This is my test content');
    await userEvent.click(screen.getByLabelText(/positive/i));
    
    // Submit form
    await userEvent.click(screen.getByRole('button', { name: /create entry/i }));
    
    // Verify submission
    expect(mockSubmit).toHaveBeenCalledWith({
      title: 'My Test Entry',
      content: 'This is my test content',
      mood: 'positive',
      tags: [],
      relationships: [],
      privacy: 'private',
    });
  });

  it('shows validation errors for invalid input', async () => {
    render(<JournalEntryForm onSubmit={jest.fn()} />);
    
    // Try to submit without required fields
    await userEvent.click(screen.getByRole('button', { name: /create entry/i }));
    
    // Check for validation errors
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Content must be at least 10 characters')).toBeInTheDocument();
  });
});
```

## Maintenance and Evolution

### Component Lifecycle Management

1. **Creation**: New components follow established patterns
2. **Evolution**: Backward-compatible changes with deprecation warnings
3. **Migration**: Automated codemods for breaking changes
4. **Retirement**: Gradual phase-out with clear timelines

### Version Management

```typescript
// Component versioning strategy
export { Button as ButtonV1 } from './v1/button';
export { Button as ButtonV2 } from './v2/button';
export { Button } from './v3/button'; // Current version

// Deprecation warnings
export const DeprecatedButton = (props: ButtonV1Props) => {
  useEffect(() => {
    console.warn('DeprecatedButton is deprecated. Please use Button from the latest version.');
  }, []);
  
  return <ButtonV1 {...props} />;
};
```

### Automated Maintenance

```bash
# Package scripts for maintenance
npm run design-system:audit      # Check for unused components
npm run design-system:migrate    # Run migration scripts
npm run design-system:validate   # Validate component APIs
npm run design-system:update     # Update to latest versions
```

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Next Review**: February 2025