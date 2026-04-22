import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, Image as ImageIcon, Archive, CheckCircle, Loader2, AlertCircle, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  url?: string;
  error?: string;
}

interface DropZoneUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  files: UploadedFile[];
  bucket?: string;
  maxSizeMB?: number;
  accept?: string[];
}

const VALID_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp',
  'application/pdf', 'application/zip', 'application/x-zip-compressed',
  'application/x-rar-compressed', 'application/vnd.rar', 'application/octet-stream',
];
const VALID_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.pdf', '.zip', '.rar'];

const getFileIcon = (file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (['zip', 'rar'].includes(ext || '')) return Archive;
  if (file.type.startsWith('image/')) return ImageIcon;
  return FileText;
};

const DropZoneUpload = ({
  onFilesChange,
  files,
  bucket = 'submissions',
  maxSizeMB = 50,
  accept = VALID_EXTS,
}: DropZoneUploadProps) => {
  const { user } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile> => {
    const id = crypto.randomUUID();
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    const entry: UploadedFile = { id, file, preview, uploading: true };

    // validate
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!VALID_TYPES.includes(file.type) && !VALID_EXTS.includes(ext)) {
      return { ...entry, uploading: false, error: `Unsupported: ${file.name}` };
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return { ...entry, uploading: false, error: `Too large (max ${maxSizeMB}MB): ${file.name}` };
    }

    try {
      const fileExt = file.name.split('.').pop();
      const path = `${user?.id || 'anon'}/${id}.${fileExt}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      });
      if (upErr) throw upErr;
      return { ...entry, uploading: false, url: path };
    } catch (err: any) {
      return { ...entry, uploading: false, error: err.message || 'Upload failed' };
    }
  }, [user, bucket, maxSizeMB]);

  const processFiles = useCallback(async (rawFiles: File[]) => {
    if (!user) return;
    setError('');

    const newEntries: UploadedFile[] = rawFiles.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
      uploading: true,
    }));

    const updated = [...files, ...newEntries];
    onFilesChange(updated);

    const results = await Promise.all(rawFiles.map(uploadFile));

    onFilesChange(prev => {
      const map = new Map(results.map(r => [r.file.name + r.file.size, r]));
      return prev.map(p => {
        const key = p.file.name + p.file.size;
        return map.has(key) ? map.get(key)! : p;
      });
    });
  }, [files, onFilesChange, uploadFile, user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeFile = async (f: UploadedFile) => {
    if (f.url && user) {
      try { await supabase.storage.from(bucket).remove([f.url]); } catch {}
    }
    if (f.preview) URL.revokeObjectURL(f.preview);
    onFilesChange(files.filter(x => x.id !== f.id));
  };

  const uploading = files.filter(f => f.uploading).length;
  const done = files.filter(f => f.url && !f.error).length;
  const errored = files.filter(f => f.error).length;

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group
          ${dragging
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-border/60 bg-muted/10 hover:border-primary/40 hover:bg-primary/5'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept.join(',')}
          onChange={handleInput}
          className="hidden"
        />
        <motion.div
          animate={{ scale: dragging ? 1.1 : 1 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col items-center gap-2"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-primary/20' : 'bg-muted/30 group-hover:bg-primary/10'}`}>
            {uploading > 0
              ? <Loader2 className="w-6 h-6 text-primary animate-spin" />
              : dragging
                ? <FolderOpen className="w-6 h-6 text-primary" />
                : <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold">
              {dragging ? 'Drop to upload' : uploading > 0 ? `Uploading ${uploading} file(s)...` : 'Drag files here or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {accept.join(', ')} · Max {maxSizeMB}MB each
            </p>
          </div>
        </motion.div>

        {/* Progress overlay */}
        {uploading > 0 && (
          <div className="absolute inset-0 rounded-2xl bg-primary/5 flex items-center justify-center pointer-events-none">
            <div className="h-1 bg-primary/20 rounded-full w-3/4 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${(done / files.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* File Grid */}
      <AnimatePresence initial={false}>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
          >
            {files.map(f => {
              const Icon = getFileIcon(f.file);
              return (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group rounded-xl border border-border/40 overflow-hidden bg-muted/10"
                >
                  {/* Preview */}
                  {f.preview ? (
                    <img src={f.preview} alt={f.file.name} className="w-full h-24 object-cover" />
                  ) : (
                    <div className="w-full h-24 flex items-center justify-center bg-muted/20">
                      <Icon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlay states */}
                  {f.uploading && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                  {f.url && !f.error && !f.uploading && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 drop-shadow" />
                    </div>
                  )}
                  {f.error && (
                    <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    </div>
                  )}

                  {/* Hover remove */}
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 text-[10px] gap-1"
                      onClick={e => { e.stopPropagation(); removeFile(f); }}
                      disabled={f.uploading}
                    >
                      <X className="w-3 h-3" /> Remove
                    </Button>
                  </div>

                  {/* Info */}
                  <div className="p-1.5 bg-background/40 backdrop-blur-sm">
                    <p className="text-[9px] truncate font-medium">{f.file.name}</p>
                    <p className="text-[8px] text-muted-foreground">
                      {(f.file.size / 1024 / 1024).toFixed(1)} MB
                      {f.error && <span className="text-destructive"> · {f.error}</span>}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      {files.length > 0 && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="text-emerald-500 font-medium">{done} uploaded</span>
          {uploading > 0 && <span className="text-primary">{uploading} uploading...</span>}
          {errored > 0 && <span className="text-destructive">{errored} failed</span>}
        </div>
      )}
    </div>
  );
};

export default DropZoneUpload;
