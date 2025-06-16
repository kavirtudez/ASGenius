import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createSection, getSections, addReportToSection } from "@/lib/storage";

// Define the Section interface locally
interface Section {
  id: string;
  name: string;
  reports: string[];
}

interface AddToSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
}

export const AddToSectionModal = ({ isOpen, onClose, reportId }: AddToSectionModalProps) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedOption, setSelectedOption] = useState<"existing" | "new">("existing");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [newSectionName, setNewSectionName] = useState("");
  
  // Load sections on open
  useEffect(() => {
    if (isOpen) {
      loadSections();
    }
  }, [isOpen]);
  
  const loadSections = () => {
    const loadedSections = getSections();
    setSections(loadedSections);
    if (loadedSections.length > 0) {
      setSelectedSectionId(loadedSections[0].id);
    } else {
      // If no sections, default to creating a new one
      setSelectedOption("new");
    }
  };
  
  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up to the card
    
    try {
      if (selectedOption === "existing" && selectedSectionId) {
        // Add to existing section
        addReportToSection(reportId, selectedSectionId);
        const sectionName = sections.find(s => s.id === selectedSectionId)?.name;
        toast.success(`Report added to section: ${sectionName}`);
        onClose();
      } else if (selectedOption === "new" && newSectionName.trim()) {
        // Create new section and add report
        const newSection = createSection(newSectionName.trim());
        addReportToSection(reportId, newSection.id);
        toast.success(`Report added to new section: ${newSectionName}`);
        onClose();
      } else {
        toast.error("Please select a section or enter a name for a new section");
      }
    } catch (error) {
      toast.error("Failed to add report to section");
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-[425px] bg-gray-900 border-gray-700 text-white"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from triggering card click
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Add to Section</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup
            value={selectedOption}
            onValueChange={(v) => setSelectedOption(v as "existing" | "new")}
            className="space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {sections.length > 0 && (
              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <RadioGroupItem 
                    value="existing" 
                    id="existing"
                    className="border-gray-600 text-purple-400"
                  />
                  <Label htmlFor="existing" className="text-white">Add to existing section</Label>
                </div>
                
                <div className="ml-6" onClick={(e) => e.stopPropagation()}>
                  <select
                    disabled={selectedOption !== "existing"}
                    value={selectedSectionId}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelectedSectionId(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full rounded-md border bg-gray-800 border-gray-700 px-3 py-2 
                      ${selectedOption !== "existing" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                <RadioGroupItem 
                  value="new" 
                  id="new"
                  className="border-gray-600 text-purple-400"
                />
                <Label htmlFor="new" className="text-white">Create new section</Label>
              </div>
              
              <div className="ml-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  disabled={selectedOption !== "new"}
                  value={newSectionName}
                  onChange={(e) => {
                    e.stopPropagation(); 
                    setNewSectionName(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Enter section name"
                  className={`bg-gray-800 border-gray-700 text-white 
                    ${selectedOption !== "new" ? "opacity-50 cursor-not-allowed" : ""}`}
                />
                {selectedOption === "new" && (
                  <Plus className="text-gray-400" size={16} />
                )}
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-purple-700 hover:bg-purple-800"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 