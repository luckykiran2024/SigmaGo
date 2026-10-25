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
    <div className="space-y-6 font-sans">
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      {/* Field List */}
      <div className="bg-white border border-[#DCE5EA] rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#DCE5EA] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#17324D]">Field Definitions</h2>
            <p className="text-xs text-[#526679] font-medium mt-0.5">Define structured metadata fields and custom attributes for decisions.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#17324D] text-white text-xs font-bold shadow-xs hover:bg-[#224564] transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Field
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-[#637587] font-medium">
            No custom fields defined yet. Click &quot;Add Field&quot; to create one.
          </div>
        ) : (
          <div className="divide-y divide-[#DCE5EA]">
            {fields.map((field, idx) => (
              <div key={field.id} className={`px-5 py-3.5 flex items-center gap-4 hover:bg-[#F6F8F9] transition ${!field.active ? 'opacity-50' : ''}`}>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#182B3D]">{field.label}</span>
                    <span className="text-[10px] font-mono text-[#17324D] bg-[#ECF6F5] px-1.5 py-0.5 rounded border border-[#DCE5EA]">{field.key}</span>
                    {field.required && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Required</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#526679] font-medium">
                    <span>{typeLabels[field.type] || field.type}</span>
                    <span>·</span>
                    <span>{field.categories?.name || 'All categories'}</span>
                    {!field.active && (
                      <>
                        <span>·</span>
                        <span className="text-amber-600 font-semibold">Inactive</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveField(field.id, 'up')} disabled={idx === 0}
                    className="p-1.5 text-[#637587] hover:text-[#17324D] disabled:opacity-20 rounded-md hover:bg-[#EEF2F4] transition" title="Move Up">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveField(field.id, 'down')} disabled={idx === fields.length - 1}
                    className="p-1.5 text-[#637587] hover:text-[#17324D] disabled:opacity-20 rounded-md hover:bg-[#EEF2F4] transition" title="Move Down">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => startEdit(field)}
                    className="p-1.5 text-[#637587] hover:text-[#0B7780] rounded-md hover:bg-[#EEF2F4] transition" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleActive(field)}
                    className="p-1.5 text-[#637587] hover:text-[#17324D] rounded-md hover:bg-[#EEF2F4] transition"
                    title={field.active ? 'Deactivate' : 'Activate'}>
                    {field.active
                      ? <ToggleRight className="w-4 h-4 text-emerald-600" />
                      : <ToggleLeft className="w-4 h-4 text-[#637587]" />
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
        <div className="bg-white border border-[#DCE5EA] rounded-xl shadow-xs p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#17324D]">
            {editingId ? 'Edit Field' : 'New Custom Field'}
          </h3>

          {editingId && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
              ⚠️ The field key cannot be changed after creation to preserve existing data.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#182B3D] mb-1">Label</label>
                <input
                  type="text" value={label} onChange={e => setLabel(e.target.value)} required
                  className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-xs text-[#182B3D] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780]"
                  placeholder="e.g. Cost Center"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#182B3D] mb-1">Type</label>
                <select
                  value={type} onChange={e => setType(e.target.value)}
                  disabled={!!editingId}
                  className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-xs text-[#182B3D] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] disabled:bg-gray-50"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-[#182B3D] mb-1">Scope</label>
                <select
                  value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-xs text-[#182B3D] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780]"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#DCE5EA] text-[#0B7780] focus:ring-[#0B7780]" />
                  <span className="text-xs font-semibold text-[#182B3D]">Required field</span>
                </label>
              </div>
            </div>

            {type === 'SELECT' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#182B3D] mb-2">Options</label>
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
                        className="block flex-1 rounded-lg border border-[#DCE5EA] py-1.5 px-3 text-xs text-[#182B3D] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780]"
                        placeholder={`Option ${idx + 1}`}
                      />
                      {options.length > 1 && (
                        <button type="button" onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                          className="text-[#637587] hover:text-rose-600 text-xs font-bold px-2 py-1 rounded transition">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setOptions([...options, ''])}
                    className="text-xs font-bold text-[#0B7780] hover:text-[#096A72] transition">
                    + Add option
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-2">
              <button type="submit" disabled={loading}
                className="px-4 py-2 rounded-lg bg-[#17324D] text-white text-xs font-bold shadow-xs hover:bg-[#224564] disabled:opacity-50 transition">
                {loading ? 'Saving...' : editingId ? 'Update Field' : 'Create Field'}
              </button>
              <button type="button" onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-[#DCE5EA] text-xs font-semibold text-[#526679] hover:bg-[#F6F8F9] transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
