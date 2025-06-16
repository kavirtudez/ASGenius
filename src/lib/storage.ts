// Storage utilities for ESG analysis results

interface AnalysisResult {
  classification: "Major" | "Minor";
  confidenceScore: number;
}

interface Section {
  id: string;
  name: string;
  reports: string[]; // Array of report IDs
}

// Keys for storing data
const ANALYSIS_RESULTS_KEY = 'esg_analysis_results';
const SECTIONS_KEY = 'esg_report_sections';

/**
 * Save an analysis result for a specific file
 */
export function saveAnalysisResult(fileId: string, result: AnalysisResult): void {
  try {
    // Get existing results
    const existingResultsStr = localStorage.getItem(ANALYSIS_RESULTS_KEY) || '{}';
    const existingResults = JSON.parse(existingResultsStr) as Record<string, AnalysisResult>;
    
    // Ensure the classification is correct based on the confidence score
    // The threshold is now 55% (values from our new calculation function)
    if (result.confidenceScore > 55) {
      result.classification = "Major";
    } else {
      result.classification = "Minor";
    }
    
    // Update with new result
    existingResults[fileId] = result;
    
    // Save back to localStorage
    localStorage.setItem(ANALYSIS_RESULTS_KEY, JSON.stringify(existingResults));
    
  } catch (error) {
    console.error('Error saving analysis result:', error);
    throw new Error('Failed to save analysis result');
  }
}

/**
 * Get an analysis result for a specific file
 */
export function getAnalysisResult(fileId: string): AnalysisResult | null {
  try {
    const resultsStr = localStorage.getItem(ANALYSIS_RESULTS_KEY) || '{}';
    const results = JSON.parse(resultsStr) as Record<string, AnalysisResult>;
    return results[fileId] || null;
  } catch (error) {
    console.error('Error retrieving analysis result:', error);
    return null;
  }
}

/**
 * Get all analysis results
 */
export function getAllAnalysisResults(): Record<string, AnalysisResult> {
  try {
    const resultsStr = localStorage.getItem(ANALYSIS_RESULTS_KEY) || '{}';
    const results = JSON.parse(resultsStr) as Record<string, AnalysisResult>;
    
    // Ensure all results have the correct classification based on confidence score
    Object.keys(results).forEach(key => {
      const result = results[key];
      if (result.confidenceScore > 55) {
        result.classification = "Major";
      } else {
        result.classification = "Minor";
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error retrieving all analysis results:', error);
    return {};
  }
}

/**
 * Clear all analysis results
 */
export function clearAllAnalysisResults(): void {
  try {
    localStorage.removeItem(ANALYSIS_RESULTS_KEY);
  } catch (error) {
    console.error('Error clearing analysis results:', error);
  }
}

/**
 * Update an existing analysis to use the new scoring system
 * This can be used for batch updates when the system changes
 */
export function resetAndUpdateAllScores(): void {
  try {
    // Clear all results - this will force a recalculation next time analyses are loaded
    localStorage.removeItem(ANALYSIS_RESULTS_KEY);
    console.log("All analysis results have been reset for recalculation");
  } catch (error) {
    console.error('Error resetting analysis results:', error);
  }
}

/**
 * Get all sections
 */
export function getSections(): Section[] {
  try {
    const sectionsStr = localStorage.getItem(SECTIONS_KEY) || '[]';
    return JSON.parse(sectionsStr) as Section[];
  } catch (error) {
    console.error('Error retrieving sections:', error);
    return [];
  }
}

/**
 * Get section by ID
 */
export function getSectionById(sectionId: string): Section | undefined {
  try {
    const sections = getSections();
    return sections.find(section => section.id === sectionId);
  } catch (error) {
    console.error('Error retrieving section:', error);
    return undefined;
  }
}

/**
 * Create a new section
 */
export function createSection(name: string): Section {
  try {
    const sections = getSections();
    const newSection: Section = {
      id: `section_${Date.now()}`,
      name,
      reports: []
    };
    
    sections.push(newSection);
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
    return newSection;
  } catch (error) {
    console.error('Error creating section:', error);
    throw new Error('Failed to create section');
  }
}

/**
 * Update section name
 */
export function updateSectionName(sectionId: string, name: string): void {
  try {
    const sections = getSections();
    const section = sections.find(s => s.id === sectionId);
    
    if (section) {
      section.name = name;
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
    }
  } catch (error) {
    console.error('Error updating section:', error);
    throw new Error('Failed to update section');
  }
}

/**
 * Delete section
 */
export function deleteSection(sectionId: string): void {
  try {
    let sections = getSections();
    sections = sections.filter(section => section.id !== sectionId);
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
  } catch (error) {
    console.error('Error deleting section:', error);
    throw new Error('Failed to delete section');
  }
}

/**
 * Add report to section
 */
export function addReportToSection(reportId: string, sectionId: string): void {
  try {
    const sections = getSections();
    const section = sections.find(s => s.id === sectionId);
    
    if (section) {
      // Remove from any other sections first
      removeReportFromAllSections(reportId);
      
      // Add to the specified section
      if (!section.reports.includes(reportId)) {
        section.reports.push(reportId);
        localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
      }
    }
  } catch (error) {
    console.error('Error adding report to section:', error);
    throw new Error('Failed to add report to section');
  }
}

/**
 * Remove report from a specific section
 */
export function removeReportFromSection(reportId: string, sectionId: string): void {
  try {
    const sections = getSections();
    const section = sections.find(s => s.id === sectionId);
    
    if (section) {
      section.reports = section.reports.filter(id => id !== reportId);
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
    }
  } catch (error) {
    console.error('Error removing report from section:', error);
    throw new Error('Failed to remove report from section');
  }
}

/**
 * Remove report from all sections
 */
export function removeReportFromAllSections(reportId: string): void {
  try {
    const sections = getSections();
    let wasInSection = false;
    
    sections.forEach(section => {
      // Check if the report was in this section before removing
      if (section.reports.includes(reportId)) {
        wasInSection = true;
      }
      section.reports = section.reports.filter(id => id !== reportId);
    });
    
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
    
    // If the report was in a section, we implicitly move it to "Not Yet Analyzed"
    // by removing it from all sections. The dashboard already displays reports 
    // that are not in any section in the "Not Yet Analyzed" section.
    if (wasInSection) {
      // We don't need to do anything else; removing from all sections
      // automatically puts it in the "Not Yet Analyzed" category
      console.log(`Report ${reportId} moved to "Not Yet Analyzed" section`);
    }
  } catch (error) {
    console.error('Error removing report from all sections:', error);
    throw new Error('Failed to remove report from all sections');
  }
}

/**
 * Get section for a report
 */
export function getSectionForReport(reportId: string): Section | undefined {
  try {
    const sections = getSections();
    return sections.find(section => section.reports.includes(reportId));
  } catch (error) {
    console.error('Error getting section for report:', error);
    return undefined;
  }
}

/**
 * Delete report from storage and sections
 */
export function deleteReport(reportId: string): void {
  try {
    // Remove from analysis results
    const resultsStr = localStorage.getItem(ANALYSIS_RESULTS_KEY) || '{}';
    const results = JSON.parse(resultsStr) as Record<string, AnalysisResult>;
    
    if (results[reportId]) {
      delete results[reportId];
      localStorage.setItem(ANALYSIS_RESULTS_KEY, JSON.stringify(results));
    }
    
    // Remove from all sections
    removeReportFromAllSections(reportId);
  } catch (error) {
    console.error('Error deleting report:', error);
    throw new Error('Failed to delete report');
  }
}

export default {
  saveAnalysisResult,
  getAnalysisResult,
  getAllAnalysisResults,
  clearAllAnalysisResults,
  resetAndUpdateAllScores,
  getSections,
  getSectionById,
  createSection,
  updateSectionName,
  deleteSection,
  addReportToSection,
  removeReportFromSection,
  removeReportFromAllSections,
  getSectionForReport,
  deleteReport
}; 