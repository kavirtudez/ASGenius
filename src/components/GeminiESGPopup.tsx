import React, { useState } from "react";
import { Search, Globe } from "lucide-react";
import { translateESGAnalysisToChinese } from "@/lib/gemini";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface FlaggedStatement {
  statement: string;
  esg_category: string;
  reason: string;
  risk_level: "Major" | "Minor";
}

interface ReportMetadata {
  company_name: string;
  reporting_year: string;
  country_or_region: string;
  report_type: string;
}

interface GeminiData {
  report_metadata: ReportMetadata;
  confidence_score: number;
  classification: "Major" | "Minor";
  frameworks_claimed: string[];
  other_frameworks: string[];
  flagged_statements: FlaggedStatement[];
}

interface GeminiESGPopupProps {
  output: GeminiData;
  onClose: () => void;
  onStatementClick?: (statement: string) => void;
}

export function GeminiESGPopup({ output: data, onClose, onStatementClick }: GeminiESGPopupProps) {
  const [activeStatementIndex, setActiveStatementIndex] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isChineseVersion, setIsChineseVersion] = useState(false);
  const [translatedData, setTranslatedData] = useState<GeminiData | null>(null);
  
  if (!data) return null;

  // Use either the translated data or original data based on the isChineseVersion state
  const displayData = isChineseVersion && translatedData ? translatedData : data;
  
  const getRiskColor = (level: "Major" | "Minor") => {
    return level === "Major" ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
  };
  
  const getRiskEmoji = (level: "Major" | "Minor") => {
    return level === "Major" ? "🔺" : "⚠️";
  };
  
  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "Environmental": return "🌿";
      case "Social": return "👥";
      case "Governance": return "⚖️";
      default: return "📊";
    }
  };

  const getGreenwashingRisk = (score: number) => {
    if (score > 70) {
      return { label: "Major", className: "text-red-400" };
    }
    return { label: "Minor", className: "text-yellow-400" };
  };

  // Determine the correct overall classification text based on greenwashing risk
  const getOverallClassification = (score: number) => {
    const riskLevel = score > 70 ? "Major" : "Minor";
    return {
      label: `${riskLevel} cross checking needed`,
      className: riskLevel === "Major" ? "text-red-400" : "text-yellow-400"
    };
  };

  const handleStatementClick = (statement: string, index: number) => {
    if (onStatementClick) {
      setActiveStatementIndex(index);
      onStatementClick(statement);
      
      // Reset active statement after a delay
      setTimeout(() => {
        setActiveStatementIndex(null);
      }, 3000);
    }
  };

  const handleTranslateClick = async () => {
    if (isChineseVersion) {
      // Switch back to English
      setIsChineseVersion(false);
      return;
    }
    
    // Check if we already have translated data
    if (translatedData) {
      setIsChineseVersion(true);
      return;
    }
    
    // Otherwise translate the data
    setIsTranslating(true);
    
    try {
      const translated = await translateESGAnalysisToChinese(data);
      setTranslatedData(translated);
      setIsChineseVersion(true);
      toast.success("ESG analysis translated to Chinese");
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Failed to translate ESG analysis");
    } finally {
      setIsTranslating(false);
    }
  };

  // Get the classification based on the confidence score
  const overallClassification = getOverallClassification(displayData.confidence_score);

  return (
    <div className="fixed bottom-6 right-6 w-[500px] max-h-[90vh] overflow-y-auto bg-gray-900 shadow-2xl rounded-xl p-5 z-50 border border-gray-700 text-white animate-scale-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">🔍 Gemini ESG Analysis</h2>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTranslateClick}
                disabled={isTranslating}
                className="flex items-center gap-1 text-xs px-2 py-1 h-8"
              >
                {isTranslating ? (
                  <span className="animate-pulse">Translating...</span>
                ) : (
                  <>
                    <Globe size={14} className="mr-1" />
                    {isChineseVersion ? "Switch to English" : "Translate to Chinese"}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isChineseVersion ? "View in English" : "将分析结果翻译成中文"}
            </TooltipContent>
          </Tooltip>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
      </div>
      
      {displayData.report_metadata && (
        <>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <span className="text-blue-400">📄</span> Report Metadata
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-4 bg-gray-800/50 p-3 rounded-lg">
            <div>
              <p className="font-semibold text-gray-100 flex items-center gap-1">
                🏢 Company Name
              </p>
              <span>{displayData.report_metadata.company_name || "N/A"}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-100 flex items-center gap-1">
                🗓️ Reporting Year
              </p>
              <span>{displayData.report_metadata.reporting_year || "N/A"}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-100 flex items-center gap-1">
                🌍 Country/Region
              </p>
              <span>{displayData.report_metadata.country_or_region || "N/A"}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-100 flex items-center gap-1">
                📑 Report Type
              </p>
              <span>{displayData.report_metadata.report_type || "N/A"}</span>
            </div>
          </div>
          <hr className="my-3 border-gray-700" />
        </>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-4 bg-gray-800/50 p-3 rounded-lg">
        <div>
          <p className="font-semibold text-gray-100 flex items-center gap-1">
            <span className="text-green-400">🟢</span> Potential Greenwashing
          </p>
          <span>
            {displayData.confidence_score}%
            <span className={`ml-2 font-semibold ${getGreenwashingRisk(displayData.confidence_score).className}`}>
              ({getGreenwashingRisk(displayData.confidence_score).label})
            </span>
          </span>
        </div>
        <div>
          <p className="font-semibold text-gray-100 flex items-center gap-1">
            <span className="text-amber-400">🔥</span> Overall Classification
          </p>
          <span className={overallClassification.className}>
            {overallClassification.label}
          </span>
        </div>
        <div>
          <p className="font-semibold text-gray-100 flex items-center gap-1">
            <span className="text-blue-400">📘</span> Claimed Frameworks
          </p>
          <span>{displayData.frameworks_claimed.join(", ") || "None"}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-100 flex items-center gap-1">
            <span className="text-blue-300">🌍</span> Other Frameworks
          </p>
          <span>{displayData.other_frameworks.join(", ") || "None"}</span>
        </div>
      </div>

      <hr className="my-3 border-gray-700" />

      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <span className="text-amber-400">📌</span> Flagged Statements
      </h3>
      <div className="space-y-3">
        {displayData.flagged_statements.map((item, idx) => (
          <div 
            key={idx} 
            className={`bg-gray-800 p-3 rounded-lg border transition-all duration-300 cursor-pointer group
              ${activeStatementIndex === idx 
                ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                : 'border-gray-700 hover:border-blue-500/50'}`}
            onClick={() => handleStatementClick(item.statement, idx)}
          >
            <div className="flex items-start justify-between">
              <p className="font-semibold text-gray-100 mb-2 italic">&quot;{item.statement}&quot;</p>
              <div className="flex items-center">
                {activeStatementIndex === idx && (
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded mr-2">
                    Searching...
                  </span>
                )}
                <Search 
                  size={16} 
                  className={`${activeStatementIndex === idx 
                    ? 'text-blue-400' 
                    : 'text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity'} mt-1 ml-2 flex-shrink-0`} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <p>
                  <strong className="flex items-center gap-1">
                    <span>{getCategoryEmoji(item.esg_category)}</span> Category:
                  </strong> {item.esg_category}
                </p>
                <p>
                  <strong className="flex items-center gap-1">
                    <span>{getRiskEmoji(item.risk_level)}</span> Risk Level:
                  </strong> 
                  <span className={getRiskColor(item.risk_level)}>{item.risk_level}</span>
                </p>
                <p className="col-span-2">
                  <strong className="flex items-center gap-1">
                    <span className="text-blue-400">🧠</span> Reason:
                  </strong> {item.reason}
                </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 