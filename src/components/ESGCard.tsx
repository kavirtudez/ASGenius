import { FileText, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CardMenu } from "./CardMenu";

interface ESGCardProps {
  id: string;
  title: string;
  date: string;
  sources: number;
  icon: string;
  onClick: () => void;
  classification?: "Major" | "Minor";
  confidenceScore?: number;
  onDelete?: () => void;
}

export const ESGCard = ({ 
  id,
  title, 
  date, 
  sources, 
  icon, 
  onClick, 
  classification: propClassification,
  confidenceScore,
  onDelete
}: ESGCardProps) => {
  // Determine actual classification based on confidence score
  // This ensures UI always shows the correct classification regardless of what was passed
  const classification = confidenceScore !== undefined 
    ? (confidenceScore > 55 ? "Major" : "Minor") 
    : propClassification;
  
  // Determine badge colors based on classification
  const getBadgeStyles = () => {
    if (classification === "Major") {
      return "bg-red-900/50 border-red-600 text-red-400";
    }
    if (classification === "Minor") {
      return "bg-yellow-900/50 border-yellow-600 text-yellow-400";
    }
    return "";
  };
  
  // Get classification emoji
  const getClassificationEmoji = () => {
    if (classification === "Major") {
      return "🔴";
    }
    if (classification === "Minor") {
      return "🟡";
    }
    return "";
  };
  
  return (
    <Card 
      className="bg-gray-800 border-gray-700 p-6 cursor-pointer hover:bg-gray-750 transition-all duration-200 hover:scale-105 group animate-fade-in relative"
      onClick={onClick}
    >
      {/* Classification Badge */}
      {classification && (
        <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold border ${getBadgeStyles()}`}>
          {getClassificationEmoji()} {classification}
        </div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <div className="text-4xl">{icon}</div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <CardMenu reportId={id} onDelete={onDelete} />
        </div>
      </div>
      
      <h3 className="text-white font-medium text-lg mb-2 line-clamp-2">
        {title}
      </h3>
      
      <p className="text-gray-400 text-sm">
        {date} • {sources} source{sources !== 1 ? 's' : ''}
      </p>
      
      {/* Confidence Score Badge */}
      {confidenceScore !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${confidenceScore > 55 ? 'bg-red-500' : 'bg-yellow-500'}`}
              style={{ width: `${confidenceScore}%` }}
            ></div>
          </div>
          <span className={`text-xs font-semibold ${confidenceScore > 55 ? 'text-red-400' : 'text-yellow-400'}`}>
            {confidenceScore}%
          </span>
        </div>
      )}
    </Card>
  );
};
