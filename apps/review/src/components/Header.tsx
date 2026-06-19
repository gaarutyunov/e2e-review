import { useRef } from 'react';
import type { DataSource } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Download, Upload, Database, Menu } from 'lucide-react';

interface Props {
  source: DataSource;
  canUseFolder: boolean;
  onOpenFolder: () => void;
  onUseBundled: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onToggleNav: () => void;
}

export function Header({
  source,
  canUseFolder,
  onOpenFolder,
  onUseBundled,
  onExport,
  onImport,
  onToggleNav,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onToggleNav} aria-label="Toggle navigation">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="flex items-center gap-2 text-base font-bold sm:text-lg">
          <Database className="h-5 w-5" />
          <span className="hidden sm:inline">E2E Review</span>
        </h1>
        <Badge variant="outline" className="ml-1" data-testid="source-label">
          {source.label}
        </Badge>

        <div className="ml-auto flex items-center gap-1.5">
          {source.kind !== 'static' && import.meta.env.VITE_DATA_MODE !== 'server' && (
            <Button variant="ghost" size="sm" onClick={onUseBundled} title="Use bundled results">
              <Database className="h-4 w-4" />
              <span className="hidden md:inline">Bundled</span>
            </Button>
          )}
          {canUseFolder && (
            <Button variant="ghost" size="sm" onClick={onOpenFolder} data-testid="open-folder" title="Open a local results folder">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden md:inline">Open folder</span>
            </Button>
          )}
          {source.localComments && (
            <>
              <Button variant="ghost" size="sm" onClick={onExport} title="Export comments as JSON">
                <Download className="h-4 w-4" />
                <span className="hidden md:inline">Export</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} title="Import comments JSON">
                <Upload className="h-4 w-4" />
                <span className="hidden md:inline">Import</span>
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
