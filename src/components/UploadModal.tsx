import { useState, useRef, DragEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, File, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (file: File, filePath: string) => void;
}

export const UploadModal = ({ isOpen, onClose, onSuccess }: UploadModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("Uncategorized");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      if (files[0].type === "application/pdf") {
        setSelectedFile(files[0]);
        // Set default title from filename
        setTitle(files[0].name.replace('.pdf', ''));
        setError(null);
      } else {
        setError("Invalid file type. Please select a PDF.");
        setSelectedFile(null);
      }
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileChange(e.dataTransfer.files);
  };

  const handleClose = () => {
    if (isUploading) return;
    setSelectedFile(null);
    setTitle("");
    setCategory("Uncategorized");
    setError(null);
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", title);
    formData.append("category", category);

    try {
      const response = await fetch("http://localhost:4000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed. Please try again.");
      }

      const data = await response.json();
      onSuccess(selectedFile, data.file.filePath);
      handleClose();

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsUploading(false);
    }
  };

  const categories = [
    "Uncategorized",
    "Sustainability",
    "Carbon Footprint",
    "Social Impact",
    "Governance",
    "Environmental",
    "Supply Chain",
    "Renewable Energy",
    "Diversity & Inclusion",
    "Water Conservation",
    "Waste Reduction"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Upload ESG Report</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {selectedFile ? (
            <div className="flex items-center justify-between p-4 rounded-md bg-gray-800 border border-gray-600">
              <div className="flex items-center gap-3">
                <File className="h-6 w-6 text-blue-400" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-gray-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} disabled={isUploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-center text-sm text-gray-300">
                Drag & Drop your PDF here <br /> or <span className="font-semibold text-blue-400">click to browse</span>
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e.target.files)}
                accept=".pdf"
                className="hidden"
              />
            </div>
          )}

          {selectedFile && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm text-gray-300">Report Title</Label>
                <Input 
                  id="title"
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Enter report title"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm text-gray-300">Category</Label>
                <select 
                  id="category"
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-md p-2 text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isUploading} className="border-gray-600 text-gray-300 hover:bg-gray-800">
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading || !title.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isUploading ? "Uploading..." : "Upload Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 