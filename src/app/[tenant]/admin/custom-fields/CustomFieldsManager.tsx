'use client'

import { useState } from 'react'
import { Plus, ArrowUp, ArrowDown, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  createCustomFieldAction,
  updateCustomFieldAction,
  moveFieldAction,
} from './actions'

interface CustomField {
  id: string
  label: string
  key: string
  type: string
  options: string[] | null
  required: boolean
  category_id: string | null
  sort_order: number
  active: boolean
  categories?: { name: string } | null
}

interface Props {
  tenant: string
  fields: CustomField[]
  categories: { id: string; name: string }[]
}

export default function CustomFieldsManager({ tenant, fields: initialFields, categories }: Props) {
  const [fields, setFields] = useState(initialFields)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [label, setLabel] = useState('')
  const [type, setType] = useState('TEXT')
  const [required, setRequired] = useState(false)
  const [categoryId, setCategoryId] = useState<string>('')
  const [options, setOptions] = useState<string[]>([''])

  const resetForm = () => {
    setLabel('')
    setType('TEXT')
    setRequired(false)
    setCategoryId('')
    setOptions([''])
    setEditingId(null)
    setShowForm(false)
    setError(null)
  }

  const startEdit = (field: CustomField) => {
    setLabel(field.label)
    setType(field.type)
    setRequired(field.required)
    setCategoryId(field.category_id || '')
    setOptions(field.options && field.options.length > 0 ? field.options : [''])
    setEditingId(field.id)
    setShowForm(true)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (editingId) {
        await updateCustomFieldAction(tenant, editingId, {
          label,
          type,
          options: type === 'SELECT' ? options.filter(o => o.trim()) : undefined,
          required,
          categoryId: categoryId || null,
        })
      } else {
        await createCustomFieldAction(tenant, {
          label,
          type,
          options: type === 'SELECT' ? options.filter(o => o.trim()) : undefined,
          required,
          categoryId: categoryId || null,
        })
      }
      resetForm()
      // Reload page to get fresh data
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Failed to save field')
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (field: CustomField) => {
    try {
      await updateCustomFieldAction(tenant, field.id, {
        active: !field.active,
      })
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const moveField = async (fieldId: string, direction: 'up' | 'down') => {
    try {
      await moveFieldAction(tenant, fieldId, direction)
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const typeLabels: Record<string, string> = {
    TEXT: 'Text',
    NUMBER: 'Number',
    DATE: 'Date',
    SELECT: 'Dropdown',
    PERSON: 'Person',
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Field List */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Field Definitions</h2>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-xs font-bold shadow-sm hover:bg-accent/90 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Field
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400 font-medium">
            No custom fields defined yet. Click "Add Field" to create one.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {fields.map((field, idx) => (
              <div key={field.id} className={`px-5 py-3.5 flex items-center gap-4 ${!field.active ? 'opacity-50' : ''}`}>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">{field.label}</span>
                    <span className="text-2xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{field.key}</span>
                    {field.required && (
                      <span className="text-2xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Required</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                    <span>{typeLabels[field.type] || field.type}</span>
                    <span>·</span>
                    <span>{field.categories?.name || 'All categories'}</span>
                    {!field.active && (
                      <>
                        <span>·</span>
                        <span className="text-amber-500">Inactive</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveField(field.id, 'up')} disabled={idx === 0}
                    className="p-1.5 text-gray-400 hover:text-ink disabled:opacity-20 rounded-lg hover:bg-gray-50 transition" title="Move Up">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveField(field.id, 'down')} disabled={idx === fields.length - 1}
                    className="p-1.5 text-gray-400 hover:text-ink disabled:opacity-20 rounded-lg hover:bg-gray-50 transition" title="Move Down">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => startEdit(field)}
                    className="p-1.5 text-gray-400 hover:text-accent rounded-lg hover:bg-gray-50 transition" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleActive(field)}
                    className="p-1.5 text-gray-400 hover:text-accent rounded-lg hover:bg-gray-50 transition"
                    title={field.active ? 'Deactivate' : 'Activate'}>
                    {field.active
                      ? <ToggleRight className="w-4 h-4 text-green-500" />
                      : <ToggleLeft className="w-4 h-4 text-gray-300" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5">
          <h3 className="text-sm font-bold text-ink">
            {editingId ? 'Edit Field' : 'New Custom Field'}
          </h3>

          {editingId && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700 font-medium">
              ⚠️ The field key cannot be changed after creation to preserve existing data.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Label</label>
                <input
                  type="text" value={label} onChange={e => setLabel(e.target.value)} required
                  className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="e.g. Cost Center"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Type</label>
                <select
                  value={type} onChange={e => setType(e.target.value)}
                  disabled={!!editingId}
                  className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:bg-gray-50"
                >
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                  <option value="SELECT">Dropdown (Select)</option>
                  <option value="PERSON">Person</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Scope</label>
                <select
                  value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent" />
                  <span className="text-sm font-semibold text-ink">Required field</span>
                </label>
              </div>
            </div>

            {type === 'SELECT' && (
              <div>
                <label className="block text-xs font-bold text-ink mb-2">Options</label>
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text" value={opt}
                        onChange={e => {
                          const next = [...options]
                          next[idx] = e.target.value
                          setOptions(next)
                        }}
                        className="block flex-1 rounded-xl border border-gray-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder={`Option ${idx + 1}`}
                      />
                      {options.length > 1 && (
                        <button type="button" onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500 text-xs font-bold px-2 py-1 rounded transition">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setOptions([...options, ''])}
                    className="text-xs font-bold text-accent hover:text-accent/80 transition">
                    + Add option
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-accent text-white text-xs font-bold shadow-sm hover:bg-accent/90 disabled:opacity-50 transition">
                {loading ? 'Saving...' : editingId ? 'Update Field' : 'Create Field'}
              </button>
              <button type="button" onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
