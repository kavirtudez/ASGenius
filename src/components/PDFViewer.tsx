import { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ArrowLeft, Download, ZoomIn, ZoomOut, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIChatbot } from "./AIChatbot";
import { GeminiESGPopup } from "./GeminiESGPopup";
import { analyzeESGReport } from "@/lib/gemini";
import { toast } from "sonner";
import { saveAnalysisResult } from "@/lib/storage";

// Define custom interface for PDF.js viewer window
interface PDFJSWindow extends Window {
  PDFViewerApplication?: {
    findController: {
      executeCommand: (cmd: string, params: any) => void;
    };
    eventBus?: {
      on: (eventName: string, callback: (event: any) => void) => void;
      off: (eventName: string, callback: (event: any) => void) => void;
    };
    pdfViewer?: {
      scrollPageIntoView: (options: { pageNumber: number, destArray?: any[] }) => void;
    };
  };
  find?: (
    searchString: string,
    caseSensitive?: boolean,
    backwards?: boolean,
    wrapAround?: boolean,
    wholeWord?: boolean,
    searchInFrames?: boolean,
    showDialog?: boolean
  ) => boolean;
}

interface PDFViewerProps {
  fileName: string;
  fileUrl: string;
  onBack: () => void;
  pdfContext: string | null;
  fileId?: string; // Added fileId prop to identify the PDF
}

export const PDFViewer = ({ 
  fileName, 
  fileUrl, 
  onBack, 
  pdfContext: initialPdfContext,
  fileId 
}: PDFViewerProps) => {
  const [zoom, setZoom] = useState(100);
  const [geminiOutput, setGeminiOutput] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pdfContext, setPdfContext] = useState<string | null>(initialPdfContext);

  // When the initial context changes, update the state
  useEffect(() => {
    setPdfContext(initialPdfContext);
  }, [initialPdfContext]);

  // Extract text from PDF when component mounts if no context was provided
  useEffect(() => {
    const extractPdfTextOnLoad = async () => {
      // Only extract text if we don't have it already
      if (!pdfContext && fileUrl) {
        setIsExtracting(true);
        toast.info("Preparing PDF for AI analysis...");
        
        try {
          const extractedText = await extractTextFromUrl(fileUrl);
          setPdfContext(extractedText);
          toast.success("PDF is ready for AI analysis");
        } catch (error) {
          console.error("Failed to extract text from PDF:", error);
          toast.error("Could not extract text from PDF. AI features may be limited.");
        } finally {
          setIsExtracting(false);
        }
      }
    };
    
    extractPdfTextOnLoad();
  }, [fileUrl, pdfContext]);

  // Check for existing analysis result on load
  useEffect(() => {
    if (fileId) {
      try {
        const savedAnalysis = localStorage.getItem(`gemini_analysis_${fileId}`);
        if (savedAnalysis) {
          setGeminiOutput(JSON.parse(savedAnalysis));
        }
      } catch (error) {
        console.error("Error loading saved analysis:", error);
      }
    }
  }, [fileId]);

  const extractTextFromUrl = async (url: string): Promise<string> => {
    // Configure PDF.js with cMap parameters
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const pdf = await pdfjsLib.getDocument({
      url,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
      cMapPacked: true
    }).promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");
      fullText += `\n\nPage ${i}:\n${pageText}`;
    }
    return fullText;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAnalyzeClick = async () => {
    let contextToAnalyze = pdfContext;

    if (!contextToAnalyze) {
      setIsExtracting(true);
      toast.info("Extracting text from PDF for analysis...");
      try {
        const extractedText = await extractTextFromUrl(fileUrl);
        setPdfContext(extractedText);
        contextToAnalyze = extractedText;
      } catch (error) {
        console.error("Failed to extract text from PDF:", error);
        toast.error("Could not extract text from PDF. The file may be corrupt or unreadable.");
        setIsExtracting(false);
        return;
      } finally {
        setIsExtracting(false);
      }
    }

    if (!contextToAnalyze) {
      setAnalysisError("PDF content is not available for analysis.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setGeminiOutput(null);

    try {
      const output = await analyzeESGReport(contextToAnalyze);
      setGeminiOutput(output);

      // Save the analysis result with the file ID
      if (fileId) {
        try {
          // Save to localStorage
          localStorage.setItem(`gemini_analysis_${fileId}`, JSON.stringify(output));
          
          // Save to our storage utility for dashboard categorization
          saveAnalysisResult(fileId, {
            classification: output.classification,
            confidenceScore: output.confidence_score
          });
          
          toast.success("Analysis saved successfully");
        } catch (error) {
          console.error("Error saving analysis result:", error);
          toast.error("Failed to save analysis result");
        }
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during analysis.";
      setAnalysisError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const searchAndScrollToText = (text: string) => {
    if (!iframeRef.current || !text) return;

    setIsSearching(true);
    const searchText = text.split(' ').slice(0, 5).join(' ').replace(/["']/g, '').trim();

    setTimeout(() => {
      try {
        const iframe = iframeRef.current;
        const iframeWindow = iframe?.contentWindow as PDFJSWindow | null;

        if (!iframeWindow) throw new Error("Could not access iframe content.");

        // For PDF.js viewers, use its internal find controller
        if (iframeWindow.PDFViewerApplication?.findController) {
          // This command is equivalent to Ctrl+A and replacing the search term
          iframeWindow.PDFViewerApplication.findController.executeCommand('find', {
            query: searchText,
            phraseSearch: true,
            highlightAll: true,
            findPrevious: false,
            caseSensitive: false
          });
        } else if (iframeWindow.find) {
          // Fallback for standard browser PDF viewers
          iframeWindow.find(searchText, false, false, true, false, true, false);
        }

        toast.success(`Searching for: "${searchText}"`);
      } catch (error) {
        console.error("Error searching in PDF:", error);
        toast.error("Could not search in PDF. Please try again.");
      } finally {
        setIsSearching(false);
      }
    }, 500); // Delay to ensure PDF viewer is ready
  };

  const getButtonState = () => {
    if (isExtracting) return { disabled: true, text: "Preparing..." };
    if (isAnalyzing) return { disabled: true, text: "Analyzing..." };
    return { disabled: false, text: "Analyze" };
  };

  const buttonState = getButtonState();

  // Additional content status for the AI information display
  const aiContentStatus = pdfContext 
    ? "AI has access to this PDF's content" 
    : isExtracting 
      ? "Preparing PDF content for AI..." 
      : "AI does not have access to this PDF yet";

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              className="text-gray-400 hover:text-white p-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{fileName}</h1>
              <p className="text-sm text-gray-400">ESG Report</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-800 rounded-lg">
              <Button
                variant="ghost"
                onClick={handleZoomOut}
                className="p-2 text-gray-400 hover:text-white"
                disabled={zoom <= 50}
              >
                <ZoomOut size={16} />
              </Button>
              <span className="px-3 py-2 text-sm text-gray-300 min-w-[60px] text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                onClick={handleZoomIn}
                className="p-2 text-gray-400 hover:text-white"
                disabled={zoom >= 200}
              >
                <ZoomIn size={16} />
              </Button>
            </div>
            
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={handleDownload}
            >
              <Download size={16} className="mr-2" />
              Download
            </Button>

            <Button
              variant="outline"
              className="border-purple-600/50 text-purple-300 hover:bg-purple-800/20 bg-purple-900/20"
              onClick={handleAnalyzeClick}
              disabled={buttonState.disabled}
            >
              {isAnalyzing || isExtracting ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Sparkles size={16} className="mr-2" />
              )}
              {buttonState.text}
            </Button>

            {/* AI Content Status Indicator */}
            <div className={`text-xs px-3 py-1 rounded-full flex items-center ${
              pdfContext ? 'bg-green-900/30 text-green-300 border border-green-800' : 
              isExtracting ? 'bg-blue-900/30 text-blue-300 border border-blue-800' : 
              'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
              {pdfContext && <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>}
              {isExtracting && <Loader2 size={10} className="animate-spin mr-2" />}
              {aiContentStatus}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div 
          className="bg-white rounded-lg shadow-2xl mx-auto transition-all duration-300 overflow-hidden"
          style={{ 
            width: '100%',
            height: 'calc(100vh - 200px)',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center'
          }}
        >
          <iframe
            ref={iframeRef}
            src={fileUrl}
            title={fileName}
            className="w-full h-full"
            style={{ border: 'none' }}
          />
        </div>
      </div>

      {/* Gemini ESG Analysis Popup */}
      {geminiOutput && (
        <GeminiESGPopup
          output={geminiOutput}
          onClose={() => setGeminiOutput(null)}
          onStatementClick={searchAndScrollToText}
        />
      )}

      {/* AI Chatbot */}
      <AIChatbot pdfContext={pdfContext} />

      {analysisError && (
          <div className="fixed bottom-6 right-6 w-[500px] bg-red-900/80 backdrop-blur-sm border border-red-500 text-white p-4 rounded-lg z-50">
              <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Analysis Error</h3>
                  <button onClick={() => setAnalysisError(null)} className="text-gray-200 hover:text-white">✕</button>
              </div>
              <p className="text-sm mt-2">{analysisError}</p>
              <pre className="text-xs mt-2 bg-red-950/50 p-2 rounded overflow-auto max-h-[200px]">
                {analysisError}
              </pre>
          </div>
      )}

      {/* Search indicator */}
      {isSearching && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center">
          <Loader2 size={16} className="animate-spin mr-2" />
          Searching in document...
        </div>
      )}
    </div>
  );
};
