import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { CloudUpload, Camera, FileImage, X } from "lucide-react";

interface FileDropzoneProps {
  onFileUpload: (file: File) => void;
}

export default function FileDropzone({ onFileUpload }: FileDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
      clearSelection();
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  if (selectedFile) {
    return (
      <div className="space-y-4" data-testid="file-preview">
        <div className="border border-border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FileImage className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">{selectedFile.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              data-testid="button-clear-file"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {preview && (
            <div className="mb-4">
              <img
                src={preview}
                alt="Screenshot preview"
                className="max-w-full h-48 object-contain mx-auto rounded border"
                data-testid="image-preview"
              />
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
            <span>{selectedFile.type}</span>
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button onClick={handleUpload} className="bg-primary hover:bg-primary/90" data-testid="button-process-file">
            <CloudUpload className="w-4 h-4 mr-2" />
            Process with AI
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50'}
      `}
      data-testid="dropzone"
    >
      <input {...getInputProps()} data-testid="file-input" />
      
      <div className="mx-auto w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
        <CloudUpload className="text-2xl text-muted-foreground w-8 h-8" />
      </div>
      
      <h3 className="text-lg font-medium text-foreground mb-2">
        {isDragActive ? "Drop your bet screenshot here" : "Drop your bet screenshot here"}
      </h3>
      
      <p className="text-muted-foreground mb-4">
        Or click to browse files. Supports PNG, JPG, PDF
      </p>
      
      <Button
        type="button"
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        data-testid="button-screen-capture"
      >
        <Camera className="w-4 h-4 mr-2" />
        Use Screen Capture
      </Button>
    </div>
  );
}
