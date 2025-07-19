'use client'

import React from 'react'
import { MoodType } from '@/lib/types'

interface MoodOption {
  value: MoodType
  label: string
  icon: string
  color: string
}

const moodOptions: MoodOption[] = [
  {
    value: 'happy',
    label: 'Happy',
    icon: '😊',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  {
    value: 'excited',
    label: 'Excited',
    icon: '🤩',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  {
    value: 'content',
    label: 'Content',
    icon: '😌',
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  {
    value: 'neutral',
    label: 'Neutral',
    icon: '😐',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  {
    value: 'sad',
    label: 'Sad',
    icon: '😢',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    value: 'angry',
    label: 'Angry',
    icon: '😠',
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    value: 'frustrated',
    label: 'Frustrated',
    icon: '😤',
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    value: 'anxious',
    label: 'Anxious',
    icon: '😰',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    value: 'confused',
    label: 'Confused',
    icon: '😕',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    value: 'grateful',
    label: 'Grateful',
    icon: '🙏',
    color: 'bg-pink-100 text-pink-800 border-pink-200',
  },
]

interface MoodSelectorProps {
  value?: MoodType
  onChange: (mood: MoodType | undefined) => void
  label?: string
  error?: string
}

export default function MoodSelector({
  value,
  onChange,
  label = 'How are you feeling?',
  error,
}: MoodSelectorProps) {
  const handleMoodSelect = (mood: MoodType) => {
    if (value === mood) {
      // Deselect if clicking the same mood
      onChange(undefined)
    } else {
      onChange(mood)
    }
  }

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {moodOptions.map(mood => (
          <button
            key={mood.value}
            type="button"
            onClick={() => handleMoodSelect(mood.value)}
            className={`
              flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all
              hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
              ${
                value === mood.value
                  ? `${mood.color} border-current shadow-md`
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }
            `}
            title={mood.label}
          >
            <span className="text-lg mb-1">{mood.icon}</span>
            <span className="text-xs font-medium truncate w-full text-center">
              {mood.label}
            </span>
          </button>
        ))}
      </div>

      {value && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Selected mood: {moodOptions.find(m => m.value === value)?.label}
          </span>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
