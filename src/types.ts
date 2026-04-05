export interface DefectResult {
  id: number;
  label: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  color: string;
}

export interface InspectionResult {
  imageUrl: string;
  defects: DefectResult[];
  verdict: 'PASS' | 'DEFECT_DETECTED';
  timestamp: string;
  processingTime: number;
}

export type DefectType = 'crack' | 'damage' | 'broken' | 'scratches';

export interface ShapeInfo {
  aspectRatio: number;
  circularity: number;
  convexity: number;
  elongation: number;
  compactness: number;
  dimension: '2D-flat' | '3D-depth';
  contourType: 'linear' | 'circular' | 'irregular' | 'branching' | 'compact';
}

export interface NavSection {
  id: string;
  label: string;
}

export interface BBoxAnnotation {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: DefectType;
}

export interface TrainingImage {
  id: string;
  dataUrl: string;
  fileName: string;
  annotations: BBoxAnnotation[];
}

export interface LearnedPattern {
  type: DefectType;
  avgBrightness: number;
  variance: number;
  edgeScore: number;
  aspectRatio: number;
  sourceImageId: string;
}

export interface TrainedImageData {
  fingerprint: string;
  imageData: string;
  annotations: BBoxAnnotation[];
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  mode: 'image' | 'video' | 'webcam' | 'esp32';
  verdict: 'PASS' | 'DEFECT';
  defectCount: number;
  defectTypes: string[];
  confidence: number;
  processingTime: number;
  image?: string;
}
