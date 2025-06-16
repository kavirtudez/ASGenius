import { useState } from "react";
import { MoreVertical, Trash2, FolderPlus, FolderMinus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteReport, getSectionForReport, removeReportFromAllSections } from "@/lib/storage";
import { AddToSectionModal } from "./AddToSectionModal";
import { toast } from "sonner";

interface CardMenuProps {
  reportId: string;
  onDelete?: () => void;
}

export const CardMenu = ({ reportId, onDelete }: CardMenuProps) => {
  const [isAddToSectionOpen, setIsAddToSectionOpen] = useState(false);
  const section = getSectionForReport(reportId);
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    // Confirm deletion
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        deleteReport(reportId);
        toast.success("Report deleted successfully");
        if (onDelete) onDelete();
      } catch (error) {
        toast.error("Failed to delete report");
        console.error("Error deleting report:", error);
      }
    }
  };
  
  const handleAddToSection = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsAddToSectionOpen(true);
  };
  
  const handleRemoveFromSection = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    try {
      removeReportFromAllSections(reportId);
      toast.success("Report removed from section");
      if (onDelete) onDelete(); // Trigger refresh of the dashboard
    } catch (error) {
      toast.error("Failed to remove report from section");
      console.error("Error removing report from section:", error);
    }
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            onClick={(e) => e.stopPropagation()} 
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            <MoreVertical size={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end"
          className="bg-gray-800 border-gray-700 text-gray-200"
        >
          <DropdownMenuLabel className="text-gray-400">Actions</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem 
            onClick={handleAddToSection}
            className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            <span>Add to Section</span>
          </DropdownMenuItem>
          
          {section && (
            <DropdownMenuItem
              onClick={handleRemoveFromSection}
              className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700"
            >
              <FolderMinus className="mr-2 h-4 w-4" />
              <span>Remove from Section</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem 
            onClick={handleDelete}
            className="cursor-pointer text-red-400 hover:bg-red-900/50 focus:bg-red-900/50 hover:text-red-300"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <AddToSectionModal
        isOpen={isAddToSectionOpen}
        onClose={() => setIsAddToSectionOpen(false)}
        reportId={reportId}
      />
    </>
  );
}; 