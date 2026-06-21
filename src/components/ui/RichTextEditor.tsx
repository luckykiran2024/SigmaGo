"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, AlignLeft, AlignCenter, Table as TableIcon } from 'lucide-react';

interface RichTextEditorProps {
  content: any;
  onChange?: (json: any) => void;
  editable?: boolean;
}

export default function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg mx-auto focus:outline-none min-h-[200px] p-4 bg-white',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col border border-gray-200 rounded-md shadow-sm">
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 rounded-t-md">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-md hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200 text-ink' : 'text-gray-600'}`}
          >
            <Bold size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-md hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200 text-ink' : 'text-gray-600'}`}
          >
            <Italic size={18} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded-md hover:bg-gray-200 font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-ink' : 'text-gray-600'}`}
          >
            <Heading1 size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-md hover:bg-gray-200 font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-ink' : 'text-gray-600'}`}
          >
            <Heading2 size={18} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-md hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200 text-ink' : 'text-gray-600'}`}
          >
            <List size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-md hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200 text-ink' : 'text-gray-600'}`}
          >
            <ListOrdered size={18} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 rounded-md hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200 text-ink' : 'text-gray-600'}`}
          >
            <AlignLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 rounded-md hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200 text-ink' : 'text-gray-600'}`}
          >
            <AlignCenter size={18} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600"
            title="Insert Table"
          >
            <TableIcon size={18} />
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
