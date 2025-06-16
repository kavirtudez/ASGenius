import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";
import { Plus, Grid3X3, List, ChevronDown, AlertTriangle, CheckCircle, RefreshCw, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ESGCard } from "./ESGCard";
import { UploadModal } from "./UploadModal";
import { PDFViewer } from "./PDFViewer";
import { toast } from "sonner";
import { 
  getAllAnalysisResults, 
  getAnalysisResult, 
  resetAndUpdateAllScores,
  getSections,
  getSectionForReport 
} from "@/lib/storage";

// Define interfaces for data structures
interface ESGReport {
  id: string;
  title: string;
  date: string;
  sources: number;
  icon: string;
  filePath?: string;
  classification?: "Major" | "Minor";
  confidenceScore?: number;
  sectionId?: string;
}

interface Section {
  id: string;
  name: string;
  reports: string[];
}

// Define a type for the API response
interface PDFMetadata {
  id: string;
  fileName: string;
  filePath: string;
  title: string;
  category: string;
  description: string;
  uploadDate: string;
  sources: number;
}

// Map category to icon
const getCategoryIcon = (category: string): string => {
  const iconMap: Record<string, string> = {
    "Uncategorized": "📊",
    "Sustainability": "🌱",
    "Carbon Footprint": "🌍",
    "Social Impact": "🤝",
    "Governance": "⚖️",
    "Environmental": "🏭",
    "Supply Chain": "🔗",
    "Renewable Energy": "⚡",
    "Diversity & Inclusion": "👥",
    "Water Conservation": "💧",
    "Waste Reduction": "♻️"
  };
  
  return iconMap[category] || "📄";
};

// Format date from ISO string
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export const ESGDashboard = () => {
  const [reports, setReports] = useState<ESGReport[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ESGReport | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [pdfTextContext, setPdfTextContext] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentView, setCurrentView] = useState<"dashboard" | "pdf">("dashboard");

  // Fetch PDFs from the server and combine with analysis results
  useEffect(() => {
    loadReportsAndSections();
  }, []);

  const loadReportsAndSections = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:4000/api/pdfs');
      
      if (!response.ok) {
        throw new Error('Failed to fetch PDFs');
      }
      
      const data: PDFMetadata[] = await response.json();
      
      // Get all analysis results
      const analysisResults = getAllAnalysisResults();
      
      // Get all sections
      const loadedSections = getSections();
      setSections(loadedSections);
      
      // Convert API data to ESGReport format and add analysis results
      const fetchedReports: ESGReport[] = data.map(pdf => {
        const analysis = analysisResults[pdf.id] || null;
        const section = getSectionForReport(pdf.id);
        
        return {
          id: pdf.id,
          title: pdf.title,
          date: formatDate(pdf.uploadDate),
          sources: pdf.sources,
          icon: getCategoryIcon(pdf.category),
          filePath: pdf.filePath,
          classification: analysis?.classification,
          confidenceScore: analysis?.confidenceScore,
          sectionId: section?.id
        };
      });
      
      setReports(fetchedReports);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");
      fullText += `\n\nPage ${i}:\n${pageText}`;
    }
  
    return fullText;
  }

  const handleCardClick = (report: ESGReport) => {
    setSelectedReport(report);
    setCurrentView("pdf");
    
    // If this is a saved PDF with a filePath, we'll use that
    if (report.filePath) {
      setUploadedFilePath(report.filePath);
    }
    
    // For now, we don't have text context for PDFs loaded from the server
    setPdfTextContext(null);
  };

  const handleUploadSuccess = async (file: File, filePath: string) => {
    try {
      // Extract text first
      const text = await extractPdfText(file);
      setPdfTextContext(text);
      setUploadedFile(file);
      setUploadedFilePath(filePath);
      
      // Reload all reports to get the newly uploaded one
      await loadReportsAndSections();
      
      // Find the newly uploaded PDF (should be the most recent one)
      const newReport = reports[0];
      
      if (newReport) {
        toast.success("ESG report uploaded successfully!");
        setSelectedReport(newReport);
        setIsUploadModalOpen(false);
        setCurrentView("pdf");
      }
    } catch (error) {
      console.error('Error handling upload success:', error);
      toast.error('Failed to process the uploaded report');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedReport(null);
    setUploadedFile(null);
    setUploadedFilePath(null);
    setPdfTextContext(null);
    // Reload reports when returning to dashboard
    loadReportsAndSections();
  };

  const handleReportDelete = () => {
    // Reload reports and sections after a report is deleted
    loadReportsAndSections();
  };

  // Group reports by classification and sections
  const majorReports = reports.filter(report => 
    ((report.confidenceScore !== undefined && report.confidenceScore > 55) || 
    report.classification === "Major") && 
    !report.sectionId
  );
  
  const minorReports = reports.filter(report => 
    ((report.confidenceScore !== undefined && report.confidenceScore <= 55 && report.classification !== "Major") || 
    (report.classification === "Minor" && report.confidenceScore === undefined)) && 
    !report.sectionId
  );
  
  const uncategorizedReports = reports.filter(report => 
    !report.classification && report.confidenceScore === undefined && !report.sectionId
  );

  // Get reports for each custom section
  const getReportsForSection = (sectionId: string) => {
    return reports.filter(report => report.sectionId === sectionId);
  };

  if (currentView === "pdf") {
    const fileUrl = uploadedFilePath 
      ? `http://localhost:4000${uploadedFilePath}`
      : `/path/to/default.pdf`; // Fallback for existing reports
    const fileName = uploadedFile?.name || selectedReport?.title || "ESG Report";
    
    return (
      <PDFViewer 
        fileName={fileName} 
        fileUrl={fileUrl} 
        onBack={handleBackToDashboard} 
        pdfContext={pdfTextContext}
        fileId={selectedReport?.id} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold">E</span>
            </div>
            <h1 className="text-xl font-semibold">ESGenius</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-gray-700" : ""}`}
              >
                <Grid3X3 size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-gray-700" : ""}`}
              >
                <List size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-sm">Most recent</span>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Welcome to ESGenius</h2>
            <p className="text-gray-400">Manage and analyze your ESG reports</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                resetAndUpdateAllScores();
                toast.success("Analysis data has been reset. New scores will be calculated on next analysis.");
                window.location.reload();
              }}
              className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white gap-2"
              size="sm"
            >
              <RefreshCw size={14} />
              Reset Analysis
            </Button>
            
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white gap-2"
            >
              <Plus size={16} />
              Create new
            </Button>
          </div>
        </div>

        {/* Reports Sections */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-2">No reports yet</h3>
            <p className="text-gray-400 mb-6">Upload your first ESG report to get started</p>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus size={16} className="mr-2" />
              Upload Report
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Custom Sections */}
            {sections.map(section => {
              const sectionReports = getReportsForSection(section.id);
              if (sectionReports.length === 0) return null;
              
              return (
                <div key={section.id} className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Folder size={16} className="text-blue-400" />
                    <h3 className="text-xl font-semibold text-blue-400">{section.name}</h3>
                  </div>
                  <div className={`grid gap-6 ${
                    viewMode === "grid" 
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" 
                      : "grid-cols-1"
                  }`}>
                    {sectionReports.map((report, index) => (
                      <div
                        key={report.id}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <ESGCard
                          id={report.id}
                          title={report.title}
                          date={report.date}
                          sources={report.sources}
                          icon={report.icon}
                          onClick={() => handleCardClick(report)}
                          classification={report.classification}
                          confidenceScore={report.confidenceScore}
                          onDelete={handleReportDelete}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          
            {/* Major Cross-Checking Needed Section */}
            {majorReports.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                  <h3 className="text-xl font-semibold text-red-400">🟥 Major Cross-Checking Needed</h3>
                </div>
                <div className={`grid gap-6 ${
                  viewMode === "grid" 
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" 
                    : "grid-cols-1"
                }`}>
                  {majorReports.map((report, index) => (
                    <div
                      key={report.id}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <ESGCard
                        id={report.id}
                        title={report.title}
                        date={report.date}
                        sources={report.sources}
                        icon={report.icon}
                        onClick={() => handleCardClick(report)}
                        classification={report.classification}
                        confidenceScore={report.confidenceScore}
                        onDelete={handleReportDelete}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Minor Cross-Checking Needed Section */}
            {minorReports.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <h3 className="text-xl font-semibold text-yellow-400">🟨 Minor Cross-Checking Needed</h3>
                </div>
                <div className={`grid gap-6 ${
                  viewMode === "grid" 
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" 
                    : "grid-cols-1"
                }`}>
                  {minorReports.map((report, index) => (
                    <div
                      key={report.id}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <ESGCard
                        id={report.id}
                        title={report.title}
                        date={report.date}
                        sources={report.sources}
                        icon={report.icon}
                        onClick={() => handleCardClick(report)}
                        classification={report.classification}
                        confidenceScore={report.confidenceScore}
                        onDelete={handleReportDelete}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Not Analyzed Section */}
            {uncategorizedReports.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <h3 className="text-xl font-semibold text-gray-400">📋 Not Yet Analyzed</h3>
                </div>
                <div className={`grid gap-6 ${
                  viewMode === "grid" 
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" 
                    : "grid-cols-1"
                }`}>
                  {uncategorizedReports.map((report, index) => (
                    <div
                      key={report.id}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <ESGCard
                        id={report.id}
                        title={report.title}
                        date={report.date}
                        sources={report.sources}
                        icon={report.icon}
                        onClick={() => handleCardClick(report)}
                        onDelete={handleReportDelete}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};
