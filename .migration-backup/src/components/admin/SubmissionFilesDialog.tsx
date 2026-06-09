import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Download, FileIcon, ImageIcon, ExternalLink, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubmissionFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: {
    id: string;
    project_name: string;
    designer_name: string;
    service_type: string;
    files_urls: string[];
    client_ref?: string;
  } | null;
}

interface FileWithUrl {
  path: string;
  signedUrl: string | null;
  loading: boolean;
  error: string | null;
  isImage: boolean;
  fileName: string;
}

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

const getFileExtension = (path: string): string => {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

const getFileName = (path: string): string => {
  const parts = path.split('/');
  return parts[parts.length - 1];
};

const isImageFile = (path: string): boolean => {
  const ext = getFileExtension(path);
  return imageExtensions.includes(ext);
};

export const SubmissionFilesDialog = ({ open, onOpenChange, submission }: SubmissionFilesDialogProps) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileWithUrl[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    if (open && submission?.files_urls?.length) {
      initializeFiles(submission.files_urls);
    } else {
      setFiles([]);
      setSelectedIndex(0);
    }
  }, [open, submission]);

  const initializeFiles = (filePaths: string[]) => {
    const initialFiles: FileWithUrl[] = filePaths.map(path => ({
      path,
      signedUrl: null,
      loading: false,
      error: null,
      isImage: isImageFile(path),
      fileName: getFileName(path),
    }));
    setFiles(initialFiles);
    setSelectedIndex(0);
    
    // Auto-load the first file
    if (initialFiles.length > 0) {
      loadSignedUrl(0, initialFiles);
    }
  };

  const loadSignedUrl = async (index: number, currentFiles?: FileWithUrl[]) => {
    const fileList = currentFiles || files;
    const file = fileList[index];
    if (!file || file.signedUrl || file.loading) return;

    setFiles(prev => prev.map((f, i) => i === index ? { ...f, loading: true, error: null } : f));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('get-signed-url', {
        body: { filePath: file.path, expiresIn: 3600 },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || response.error?.message || 'Failed to get signed URL');
      }

      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, signedUrl: response.data.signedUrl, loading: false } : f
      ));
    } catch (error: any) {
      console.error('Error loading signed URL:', error);
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, error: error.message || 'Failed to load file', loading: false } : f
      ));
    }
  };

  const loadAllSignedUrls = async () => {
    setLoadingAll(true);
    for (let i = 0; i < files.length; i++) {
      if (!files[i].signedUrl && !files[i].error) {
        await loadSignedUrl(i);
      }
    }
    setLoadingAll(false);
  };

  const handleSelectFile = (index: number) => {
    setSelectedIndex(index);
    if (!files[index].signedUrl && !files[index].loading) {
      loadSignedUrl(index);
    }
  };

  const handlePrevious = () => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : files.length - 1;
    handleSelectFile(newIndex);
  };

  const handleNext = () => {
    const newIndex = selectedIndex < files.length - 1 ? selectedIndex + 1 : 0;
    handleSelectFile(newIndex);
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedFile = files[selectedIndex];

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            {submission.project_name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span>By {submission.designer_name}</span>
            <Badge variant="outline">{submission.service_type}</Badge>
            {submission.client_ref && (
              <Badge variant="secondary">Client: {submission.client_ref}</Badge>
            )}
            <Badge variant="outline">{files.length} file{files.length !== 1 ? 's' : ''}</Badge>
          </DialogDescription>
        </DialogHeader>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileIcon className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No files uploaded</p>
            <p className="text-sm">This submission has no attached files.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Main Preview Area */}
            <div className="relative flex-1 min-h-[300px] bg-muted/30 rounded-lg overflow-hidden">
              {selectedFile?.loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading preview...</p>
                  </div>
                </div>
              ) : selectedFile?.error ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-center px-4">
                    <AlertCircle className="w-12 h-12 text-destructive" />
                    <p className="text-sm text-destructive font-medium">{selectedFile.error}</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => loadSignedUrl(selectedIndex)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </div>
              ) : selectedFile?.signedUrl ? (
                selectedFile.isImage ? (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <img
                      src={selectedFile.signedUrl}
                      alt={selectedFile.fileName}
                      className="max-w-full max-h-full object-contain rounded-md"
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <FileIcon className="w-16 h-16 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{selectedFile.fileName}</p>
                        <p className="text-sm text-muted-foreground uppercase">
                          {getFileExtension(selectedFile.path)} file
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => window.open(selectedFile.signedUrl!, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in New Tab
                        </Button>
                        <Button
                          onClick={() => handleDownload(selectedFile.signedUrl!, selectedFile.fileName)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button onClick={() => loadSignedUrl(selectedIndex)}>
                    Load Preview
                  </Button>
                </div>
              )}

              {/* Navigation Arrows */}
              {files.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                    onClick={handleNext}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>

            {/* Thumbnails / File List */}
            {files.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {files.map((file, index) => (
                  <button
                    key={file.path}
                    onClick={() => handleSelectFile(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                      index === selectedIndex 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {file.loading ? (
                      <Skeleton className="w-full h-full" />
                    ) : file.signedUrl && file.isImage ? (
                      <img 
                        src={file.signedUrl} 
                        alt={file.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 p-1">
                        <FileIcon className="w-6 h-6 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-1">
                          {getFileExtension(file.path).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {selectedIndex + 1} of {files.length}
              </div>
              <div className="flex gap-2">
                {files.length > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={loadAllSignedUrls}
                    disabled={loadingAll}
                  >
                    {loadingAll ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Load All Previews
                  </Button>
                )}
                {selectedFile?.signedUrl && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(selectedFile.signedUrl!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleDownload(selectedFile.signedUrl!, selectedFile.fileName)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
