'use client';

import { useEffect } from 'react';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

function textToHtml(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return escaped.length > 0 ? `<p>${escaped}</p>` : '<p></p>';
    })
    .join('');
}

interface TextEditorProps {
  revisionId: string;
  body: string;
  onTextChange?: (text: string) => void;
}

export function TextEditor({ revisionId, body, onTextChange }: TextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: textToHtml(body),
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      onTextChange?.(instance.getText({ blockSeparator: '\n' }));
    },
    editorProps: {
      attributes: {
        class:
          'min-h-48 rounded-md border border-border bg-surface px-4 py-3 text-sm leading-relaxed break-words text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-accent [&_p]:my-1.5',
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(textToHtml(body));
      onTextChange?.(body);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, revisionId]);

  return <EditorContent editor={editor} />;
}
