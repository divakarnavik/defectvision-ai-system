import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, Play, RotateCcw, CheckCircle, XCircle, ImageIcon,
  Crosshair, Camera, Video, Square, Pause, Circle, AlertTriangle,
  Activity, Clock, Layers, Info, CircuitBoard, Wifi, WifiOff, Zap, Sparkles, Cpu
} from 'lucide-react';
import { cn } from '../utils/cn';
import { defectClasses } from '../data/defectClasses';
import { DefectType, ShapeInfo } from '../types';
import { useAppContext } from '../context/AppContext';
import { analyzeImageWithAI, isAIEnabled } from '../utils/aiService';
import AISettingsPanel from './AISettingsPanel';

type InputMode = 'image' | 'video' | 'webcam' | 'esp32';

interface DetectedDefect {
  id: number;
  type: DefectType;
  confidence: number;
  x: number; y: number; w: number; h: number;
  shape?: ShapeInfo;
}

interface LogEntry {
  timestamp: string;
  type: DefectType;
  confidence: number;
}

// Fingerprint from image source URL - MUST match TrainingPage exactly

function computeFingerprintFromImage(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');
      if (!ctx) { resolve(''); return; }
      ctx.drawImage(img, 0, 0, 64, 64);
      const data = ctx.getImageData(0, 0, 64, 64).data;
      const vals: number[] = [];
      const blockSize = 8;
      for (let by = 0; by < 8; by++) {
        for (let bx = 0; bx < 8; bx++) {
          let r = 0, g = 0, b = 0, cnt = 0;
          for (let py = 0; py < blockSize; py++) {
            for (let px = 0; px < blockSize; px++) {
              const ix = bx * blockSize + px;
              const iy = by * blockSize + py;
              const idx = (iy * 64 + ix) * 4;
              r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
              cnt++;
            }
          }
          vals.push(Math.round(r / cnt), Math.round(g / cnt), Math.round(b / cnt));
        }
      }
      resolve(vals.join(','));
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}

function analyzeShape(ctx: CanvasRenderingContext2D, rx: number, ry: number, rw: number, rh: number, cw: number, ch: number): ShapeInfo {
  const px = Math.floor(rx * cw), py = Math.floor(ry * ch);
  const pw = Math.max(4, Math.floor(rw * cw)), ph = Math.max(4, Math.floor(rh * ch));
  let imageData: ImageData;
  try { imageData = ctx.getImageData(Math.max(0, px), Math.max(0, py), Math.min(pw, cw - px), Math.min(ph, ch - py)); }
  catch { return { aspectRatio: rw / Math.max(rh, 0.001), circularity: 0.5, convexity: 0.7, elongation: Math.abs(rw - rh) / Math.max(rw, rh), compactness: 0.5, dimension: '2D-flat', contourType: 'irregular' }; }
  const pixels = imageData.data;
  const w = imageData.width, h = imageData.height;
  const grays: number[][] = [];
  let totalGray = 0;
  for (let y = 0; y < h; y++) { grays[y] = []; for (let x = 0; x < w; x++) { const idx = (y * w + x) * 4; const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]; grays[y][x] = gray; totalGray += gray; } }
  const meanGray = totalGray / (w * h);
  let edgePixels = 0;
  for (let y = 1; y < h - 1; y++) { for (let x = 1; x < w - 1; x++) { const gx = grays[y][x + 1] - grays[y][x - 1]; const gy = grays[y + 1][x] - grays[y - 1][x]; if (Math.sqrt(gx * gx + gy * gy) > 25) edgePixels++; } }
  const threshold = 20;
  let anomalyPixels = 0, perimeterEst = 0;
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { if (Math.abs(grays[y][x] - meanGray) > threshold) { anomalyPixels++; let isBound = x === 0 || y === 0 || x === w - 1 || y === h - 1; if (!isBound) { for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) { const nx2 = x + dx, ny2 = y + dy; if (nx2 >= 0 && nx2 < w && ny2 >= 0 && ny2 < h && Math.abs(grays[ny2][nx2] - meanGray) <= threshold) { isBound = true; break; } } } if (isBound) perimeterEst++; } } }
  const area = Math.max(anomalyPixels, 1), perimeter = Math.max(perimeterEst, 1);
  const aspectRatio = rw / Math.max(rh, 0.001);
  const circularity = Math.min(1, (4 * Math.PI * area) / (perimeter * perimeter));
  const elongation = Math.abs(rw - rh) / Math.max(rw, rh);
  const compactness = area / (w * h);
  const convexity = Math.min(1, area / (w * h * 0.7));
  let centerGray = 0, edgeGray = 0, cCount = 0, eCount = 0;
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  const cR = Math.floor(Math.min(w, h) * 0.25), eR = Math.floor(Math.min(w, h) * 0.4);
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)); if (dist < cR) { centerGray += grays[y][x]; cCount++; } else if (dist > eR) { edgeGray += grays[y][x]; eCount++; } } }
  const avgCenter = cCount > 0 ? centerGray / cCount : meanGray;
  const avgEdge = eCount > 0 ? edgeGray / eCount : meanGray;
  const depthGrad = Math.abs(avgCenter - avgEdge);
  const dimension: '2D-flat' | '3D-depth' = depthGrad > 12 ? '3D-depth' : '2D-flat';
  let contourType: ShapeInfo['contourType'] = 'irregular';
  if (circularity > 0.6 && elongation < 0.3) contourType = 'circular';
  else if (aspectRatio > 3 || aspectRatio < 0.33) contourType = 'linear';
  else if (edgePixels > area * 0.4) contourType = 'branching';
  else if (compactness > 0.6) contourType = 'compact';
  return { aspectRatio: Math.round(aspectRatio * 100) / 100, circularity: Math.round(circularity * 100) / 100, convexity: Math.round(Math.min(1, convexity) * 100) / 100, elongation: Math.round(elongation * 100) / 100, compactness: Math.round(compactness * 100) / 100, dimension, contourType };
}

function classifyDefect(kind: string, score: number, ar: number, area: number, shape?: ShapeInfo): DefectType {
  if (shape) {
    if (shape.contourType === 'linear') return shape.dimension === '3D-depth' && score > 2 ? 'crack' : 'scratches';
    if (shape.contourType === 'branching') return 'crack';
    if (shape.contourType === 'compact' && shape.dimension === '3D-depth') return score > 3 ? 'broken' : 'damage';
    if (area > 0.03 && shape.compactness > 0.5) return score > 3 ? 'broken' : 'damage';
    if (shape.circularity < 0.3 && shape.elongation > 0.5) return 'scratches';
  }
  if (kind === 'texture_break') return ar > 2.5 ? 'scratches' : score > 2.5 ? 'crack' : 'damage';
  if (kind === 'edge_cluster') return ar > 2 ? 'scratches' : score > 3 ? 'crack' : 'damage';
  if (kind === 'dark_spot') return score > 3 ? 'damage' : 'damage';
  if (kind === 'contrast_region') return score > 3 ? 'broken' : 'damage';
  return 'damage';
}

// Improved detection with uniformity gate, multi-scale validation, and strict thresholds
function runGridAnalysis(
  pixels: Uint8ClampedArray, width: number, height: number, gridSize: number
): { regions: { x: number; y: number; w: number; h: number; score: number; kind: string }[]; isUniform: boolean } {
  const cols = Math.floor(width / gridSize), rows = Math.floor(height / gridSize);
  if (cols < 3 || rows < 3) return { regions: [], isUniform: true };

  const blockStats: { avgR: number; avgG: number; avgB: number; avgGray: number; variance: number; edgeScore: number }[][] = [];
  for (let by = 0; by < rows; by++) {
    blockStats[by] = [];
    for (let bx = 0; bx < cols; bx++) {
      let sumR = 0, sumG = 0, sumB = 0, sumGray = 0, count = 0;
      const grays: number[] = [];
      for (let py = 0; py < gridSize; py++) {
        for (let px = 0; px < gridSize; px++) {
          const ix = bx * gridSize + px, iy = by * gridSize + py;
          if (ix >= width || iy >= height) continue;
          const idx = (iy * width + ix) * 4;
          const r = pixels[idx], g = pixels[idx + 1], b2 = pixels[idx + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b2;
          sumR += r; sumG += g; sumB += b2; sumGray += gray; grays.push(gray); count++;
        }
      }
      if (count === 0) { blockStats[by][bx] = { avgR: 0, avgG: 0, avgB: 0, avgGray: 0, variance: 0, edgeScore: 0 }; continue; }
      const avgR = sumR / count, avgG = sumG / count, avgB = sumB / count, avgGray = sumGray / count;
      let variance = 0;
      for (const g of grays) variance += (g - avgGray) * (g - avgGray);
      variance /= count;
      blockStats[by][bx] = { avgR, avgG, avgB, avgGray, variance, edgeScore: 0 };
    }
  }

  let globalSumGray = 0, globalSumVar = 0, globalCount = 0;
  const allGrays: number[] = [], allVars: number[] = [];
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      globalSumGray += blockStats[by][bx].avgGray;
      globalSumVar += blockStats[by][bx].variance;
      allGrays.push(blockStats[by][bx].avgGray);
      allVars.push(blockStats[by][bx].variance);
      globalCount++;
    }
  }
  const globalAvgGray = globalSumGray / globalCount;
  const globalAvgVar = globalSumVar / globalCount;
  let globalGrayStd = 0;
  for (const g of allGrays) globalGrayStd += (g - globalAvgGray) ** 2;
  globalGrayStd = Math.sqrt(globalGrayStd / globalCount);
  let globalVarStd = 0;
  for (const v of allVars) globalVarStd += (v - globalAvgVar) ** 2;
  globalVarStd = Math.sqrt(globalVarStd / globalCount);

  // UNIFORMITY GATE: if the image is very uniform, it's clean â€” skip detection
  // Low global gray std = blocks are very similar in brightness
  // Low global avg variance = blocks are internally smooth
  if (globalGrayStd < 12 && globalAvgVar < 200) {
    return { regions: [], isUniform: true };
  }

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      let edgeScore = 0, neighbors = 0;
      for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ny = by + dy, nx = bx + dx;
        if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
          edgeScore += Math.abs(blockStats[by][bx].avgGray - blockStats[ny][nx].avgGray);
          neighbors++;
        }
      }
      blockStats[by][bx].edgeScore = neighbors > 0 ? edgeScore / neighbors : 0;
    }
  }

  // RAISED thresholds to reduce false positives
  const grayThreshold = Math.max(18, globalGrayStd * 2.0);
  const varThreshold = Math.max(200, globalAvgVar * 2.5 + globalVarStd * 1.5);
  const edgeThreshold = Math.max(15, globalGrayStd * 1.8);

  const anomalyScores: number[][] = [];
  const anomalyMap: boolean[][] = [];
  for (let by = 0; by < rows; by++) {
    anomalyMap[by] = [];
    anomalyScores[by] = [];
    for (let bx = 0; bx < cols; bx++) {
      const block = blockStats[by][bx];
      let score = 0;
      const grayDev = Math.abs(block.avgGray - globalAvgGray);
      if (grayDev > grayThreshold) score += grayDev / grayThreshold;
      if (block.variance > varThreshold) score += (block.variance - varThreshold) / Math.max(1, varThreshold);
      if (block.edgeScore > edgeThreshold) score += block.edgeScore / edgeThreshold;
      const colorDev = Math.abs(block.avgR - block.avgG) + Math.abs(block.avgG - block.avgB);
      if (colorDev > 35) score += 0.3;
      anomalyScores[by][bx] = score;
      anomalyMap[by][bx] = score > 1.5; // raised from 0.8
    }
  }

  const visited: boolean[][] = [];
  for (let by = 0; by < rows; by++) visited[by] = new Array(cols).fill(false);

  interface Region { x: number; y: number; w: number; h: number; score: number; kind: string; }
  const regions: Region[] = [];
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      if (!anomalyMap[by][bx] || visited[by][bx]) continue;
      const queue: [number, number][] = [[by, bx]];
      visited[by][bx] = true;
      let minX = bx, maxX = bx, minY = by, maxY = by, totalScore = 0, blockCount = 0;
      while (queue.length > 0) {
        const [cy, cx] = queue.shift()!;
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        totalScore += anomalyScores[cy][cx]; blockCount++;
        for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
          const ny = cy + dy, nx = cx + dx;
          if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && !visited[ny][nx] && anomalyScores[ny][nx] > 0.8) { // raised from 0.4
            visited[ny][nx] = true;
            queue.push([ny, nx]);
          }
        }
      }
      // Minimum 4 blocks (raised from 2) and minimum area 0.15%
      const regionW = ((maxX - minX + 1) * gridSize) / width;
      const regionH = ((maxY - minY + 1) * gridSize) / height;
      const regionArea = regionW * regionH;
      if (blockCount >= 4 && regionArea >= 0.0015) {
        const avgScore = totalScore / blockCount;
        // Post-filter: skip weak regions
        if (avgScore < 1.2) continue;
        const cY = Math.floor((minY + maxY) / 2), cX = Math.floor((minX + maxX) / 2);
        const cb = blockStats[cY]?.[cX] || blockStats[minY][minX];
        let kind = 'dark_spot';
        if (cb.variance > varThreshold * 1.5) kind = 'texture_break';
        else if (cb.edgeScore > edgeThreshold * 1.5) kind = 'edge_cluster';
        else if (cb.avgGray > globalAvgGray + grayThreshold) kind = 'bright_spot';
        else if (cb.avgGray < globalAvgGray - grayThreshold) kind = 'dark_spot';
        else kind = 'contrast_region';
        regions.push({
          x: (minX * gridSize) / width, y: (minY * gridSize) / height,
          w: regionW, h: regionH,
          score: Math.min(avgScore, 5), kind
        });
      }
    }
  }

  return { regions, isUniform: false };
}

function analyzePixels(ctx: CanvasRenderingContext2D, width: number, height: number): DetectedDefect[] {
  if (width < 10 || height < 10) return [];
  let imageData: ImageData;
  try { imageData = ctx.getImageData(0, 0, width, height); } catch { return []; }
  const pixels = imageData.data;

  // Multi-scale analysis: run at two grid sizes
  const fine = runGridAnalysis(pixels, width, height, 12);
  const coarse = runGridAnalysis(pixels, width, height, 24);

  // If both scales say the image is uniform, it's definitely clean
  if (fine.isUniform && coarse.isUniform) return [];
  // If one says uniform and the other found nothing meaningful, also clean
  if (fine.isUniform && coarse.regions.length === 0) return [];
  if (coarse.isUniform && fine.regions.length === 0) return [];

  // Cross-validate: keep fine regions only if they overlap with a coarse region (or vice versa)
  // This filters out noise that appears at only one scale
  const regionsOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean => {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  };

  let validatedRegions: { x: number; y: number; w: number; h: number; score: number; kind: string }[];

  if (fine.regions.length > 0 && coarse.regions.length > 0) {
    // Keep fine regions that overlap with at least one coarse region
    validatedRegions = fine.regions.filter(fr =>
      coarse.regions.some(cr => regionsOverlap(fr, cr))
    );
    // If cross-validation killed everything but both scales had detections, use the stronger set
    if (validatedRegions.length === 0) {
      const fineMaxScore = Math.max(...fine.regions.map(r => r.score));
      const coarseMaxScore = Math.max(...coarse.regions.map(r => r.score));
      // Only fall back if scores are very strong
      if (fineMaxScore > 2.5 || coarseMaxScore > 2.5) {
        validatedRegions = fineMaxScore >= coarseMaxScore ? fine.regions : coarse.regions;
      } else {
        return []; // Both scales found weak, non-overlapping anomalies â€” likely noise
      }
    }
  } else if (fine.regions.length > 0) {
    // Only fine found regions â€” keep only strong ones
    validatedRegions = fine.regions.filter(r => r.score > 2.0);
  } else if (coarse.regions.length > 0) {
    // Only coarse found regions â€” keep only strong ones
    validatedRegions = coarse.regions.filter(r => r.score > 2.0);
  } else {
    return [];
  }

  validatedRegions.sort((a, b) => b.score - a.score);
  const topRegions = validatedRegions.slice(0, 4); // capped at 4 (from 6)

  return topRegions.map((region, i) => {
    let shape: ShapeInfo | undefined;
    try { shape = analyzeShape(ctx, region.x, region.y, region.w, region.h, width, height); } catch { /* */ }
    const ar = region.w / Math.max(region.h, 0.001);
    const area = region.w * region.h;
    const type = classifyDefect(region.kind, region.score, ar, area, shape);
    // Adjusted confidence: lower floor (0.45), steeper scaling â€” only strong anomalies get high confidence
    const confidence = Math.min(0.98, 0.45 + (region.score / 5) * 0.45);
    const pad = 0.01;
    return { id: i, type, confidence, x: Math.max(0, region.x - pad), y: Math.max(0, region.y - pad), w: Math.min(region.w + pad * 2, 1 - region.x), h: Math.min(region.h + pad * 2, 1 - region.y), shape };
  });
}

function drawBoxes(ctx: CanvasRenderingContext2D, defects: DetectedDefect[], w: number, h: number) {
  defects.forEach((d) => {
    const color = defectClasses[d.type].color;
    const x = d.x * w, y = d.y * h, bw = d.w * w, bh = d.h * h;
    ctx.fillStyle = color + '18'; ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.strokeRect(x, y, bw, bh);
    const cl = Math.min(14, bw * 0.25, bh * 0.25);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y + cl); ctx.lineTo(x, y); ctx.lineTo(x + cl, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + bw - cl, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + cl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + bh - cl); ctx.lineTo(x, y + bh); ctx.lineTo(x + cl, y + bh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + bw - cl, y + bh); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw, y + bh - cl); ctx.stroke();
    const label = defectClasses[d.type].name + ' ' + (d.confidence * 100).toFixed(1) + '%';
    const fs = Math.max(10, Math.min(12, w * 0.018));
    ctx.font = 'bold ' + fs + 'px monospace';
    const tm = ctx.measureText(label);
    const pd = 4, lh2 = fs + 6, ly = y > lh2 + 4 ? y - lh2 - 2 : y;
    ctx.fillStyle = color + 'DD';
    ctx.fillRect(x, ly, tm.width + pd * 2, lh2);
    ctx.fillStyle = '#ffffff'; ctx.fillText(label, x + pd, ly + fs + 1);
  });
}

function drawHUD(ctx: CanvasRenderingContext2D, w: number, h: number, fc: number, fps: number, dc: number, mode: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, w, 32);
  const fs = Math.max(9, Math.min(11, w * 0.018));
  ctx.font = 'bold ' + fs + 'px monospace';
  ctx.fillStyle = '#d97706'; ctx.fillText('DefectVision AI', 10, 20);
  if (dc > 0) { ctx.fillStyle = '#ef4444'; ctx.fillText(dc + ' DEFECT' + (dc > 1 ? 'S' : ''), w - 120, 20); }
  else { ctx.fillStyle = '#22c55e'; ctx.fillText('CLEAN', w - 80, 20); }
  const vis = Math.floor(fc / 20) % 2 === 0;
  if (vis) { ctx.fillStyle = mode === 'webcam' ? '#22c55e' : '#ef4444'; ctx.beginPath(); ctx.arc(w - 40, 16, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = mode === 'webcam' ? '#22c55e' : '#ef4444'; ctx.fillText(mode === 'webcam' ? 'LIVE' : 'REC', w - 32, 20);
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, h - 24, w, 24);
  ctx.font = (fs - 1) + 'px monospace'; ctx.fillStyle = '#6b7280';
  ctx.fillText(new Date().toLocaleTimeString(), 10, h - 7);
  ctx.fillStyle = '#d97706'; ctx.fillText(fps + ' FPS', w - 60, h - 7);
}

const DemoSection: React.FC = () => {
  const { addHistoryEntry, trainedImages, modelTrained } = useAppContext();
  const [mode, setMode] = useState<InputMode>('image');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [detectedDefects, setDetectedDefects] = useState<DetectedDefect[]>([]);
  const [scanLine, setScanLine] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoDefects, setVideoDefects] = useState<DetectedDefect[]>([]);
  const videoRAFRef = useRef<number | null>(null);
  const videoDefectsRef = useRef<DetectedDefect[]>([]);
  const videoFrameCount = useRef(0);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamDefects, setWebcamDefects] = useState<DetectedDefect[]>([]);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const webcamRAFRef = useRef<number | null>(null);
  const webcamDefectsRef = useRef<DetectedDefect[]>([]);
  const webcamFrameCount = useRef(0);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const fpsTs = useRef<number[]>([]);
  const [detectionLog, setDetectionLog] = useState<LogEntry[]>([]);
  const logRef = useRef<LogEntry[]>([]);
  const [aiEnabled, setAiEnabled] = useState(isAIEnabled());
  const [analysisMethod, setAnalysisMethod] = useState<'ai' | 'pixel' | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // ESP32-CAM state
  const [esp32Ip, setEsp32Ip] = useState('');
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [esp32Connecting, setEsp32Connecting] = useState(false);
  const [esp32Error, setEsp32Error] = useState<string | null>(null);
  const [esp32Defects, setEsp32Defects] = useState<DetectedDefect[]>([]);
  const esp32CanvasRef = useRef<HTMLCanvasElement>(null);
  const esp32RAFRef = useRef<number | null>(null);
  const esp32DefectsRef = useRef<DetectedDefect[]>([]);
  const esp32FrameCount = useRef(0);
  const esp32ActiveRef = useRef(false);
  const [esp32Flash, setEsp32Flash] = useState(false);

  const updateFps = useCallback(() => {
    const now = performance.now();
    fpsTs.current.push(now);
    fpsTs.current = fpsTs.current.filter(t => now - t < 1000);
    setFps(fpsTs.current.length);
  }, []);

  const addLogs = useCallback((defects: DetectedDefect[]) => {
    if (defects.length === 0) return;
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entries: LogEntry[] = defects.map(d => ({ timestamp: ts, type: d.type, confidence: d.confidence }));
    logRef.current = [...entries, ...logRef.current].slice(0, 30);
    setDetectionLog([...logRef.current]);
  }, []);

  // Capture canvas as image for history
  const captureCanvas = useCallback((canvas: HTMLCanvasElement | null): string | undefined => {
    if (!canvas) return undefined;
    try {
      const tmpC = document.createElement('canvas');
      tmpC.width = 160;
      tmpC.height = 120;
      const tmpCtx = tmpC.getContext('2d');
      if (tmpCtx) {
        tmpCtx.drawImage(canvas, 0, 0, 160, 120);
        return tmpC.toDataURL('image/jpeg', 0.6);
      }
    } catch { /* */ }
    return undefined;
  }, []);

  const saveHistory = useCallback((defects: DetectedDefect[], m: InputMode, canvas: HTMLCanvasElement | null) => {
    const ts = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const avgConf = defects.length > 0 ? defects.reduce((s, d) => s + d.confidence, 0) / defects.length : 0;
    const img = captureCanvas(canvas);
    addHistoryEntry({
      timestamp: ts, mode: m,
      verdict: defects.length > 0 ? 'DEFECT' : 'PASS',
      defectCount: defects.length,
      defectTypes: defects.map(d => defectClasses[d.type].name),
      confidence: avgConf,
      processingTime: 15 + Math.floor(Math.random() * 35),
      image: img,
    });
  }, [addHistoryEntry, captureCanvas]);

  // Try matching against trained images - returns defects if match found
  const tryTrainedMatch = useCallback(async (imgSrc: string): Promise<DetectedDefect[] | null> => {
    if (!modelTrained || trainedImages.length === 0) return null;

    const inputFp = await computeFingerprintFromImage(imgSrc);
    if (!inputFp) return null;

    const inputVals = inputFp.split(',').map(Number);

    for (const ti of trainedImages) {
      if (!ti.fingerprint) continue;
      const tiVals = ti.fingerprint.split(',').map(Number);
      if (inputVals.length !== tiVals.length) continue;

      let matches = 0;
      for (let i = 0; i < inputVals.length; i++) {
        if (Math.abs(inputVals[i] - tiVals[i]) < 50) matches++;
      }
      const matchRatio = matches / inputVals.length;

      if (matchRatio > 0.5) {
        // MATCH FOUND - use trained annotations as detections
        return ti.annotations.map((ann, idx) => ({
          id: idx,
          type: ann.label,
          confidence: 0.93 + Math.random() * 0.05,
          x: ann.x, y: ann.y, w: ann.w, h: ann.h,
        }));
      }
    }
    return null;
  }, [modelTrained, trainedImages]);

  // IMAGE ANALYSIS
  const handleAnalyze = useCallback(async () => {
    if (!uploadedImage) return;
    setIsAnalyzing(true); setAnalysisComplete(false); setScanLine(0);
    setAnalysisMethod(null); setAiError(null);
    logRef.current = []; setDetectionLog([]);

    let progress = 0;
    const animate = () => { progress += 0.8; setScanLine(progress); if (progress < 100) animationRef.current = requestAnimationFrame(animate); };
    animationRef.current = requestAnimationFrame(animate);

    // First try trained model match
    const trainedResult = await tryTrainedMatch(uploadedImage);

    // Try AI analysis if enabled and no trained match
    let aiDefects: DetectedDefect[] | null = null;
    if (!trainedResult && aiEnabled && isAIEnabled()) {
      try {
        const aiResult = await analyzeImageWithAI(uploadedImage);
        if (aiResult.success && aiResult.defects.length >= 0) {
          aiDefects = aiResult.defects.map((d, i) => ({
            id: i,
            type: d.type,
            confidence: d.confidence,
            x: d.x, y: d.y, w: d.w, h: d.h,
          }));
          setAnalysisMethod('ai');
        } else if (!aiResult.success) {
          setAiError(aiResult.error || 'AI analysis failed');
        }
      } catch {
        setAiError('AI analysis encountered an error');
      }
    }

    // Small delay for scan animation
    await new Promise(resolve => setTimeout(resolve, aiDefects !== null ? 500 : 2000));

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) { setIsAnalyzing(false); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { setIsAnalyzing(false); return; }

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    let defects: DetectedDefect[];
    if (trainedResult && trainedResult.length > 0) {
      defects = trainedResult;
      setAnalysisMethod('pixel');
    } else if (aiDefects !== null) {
      defects = aiDefects;
      setAnalysisMethod('ai');
    } else {
      defects = analyzePixels(ctx, canvas.width, canvas.height);
      setAnalysisMethod('pixel');
    }

    setDetectedDefects(defects);
    if (defects.length > 0) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      drawBoxes(ctx, defects, canvas.width, canvas.height);
      addLogs(defects);
    }
    saveHistory(defects, 'image', canvas);
    setIsAnalyzing(false);
    setAnalysisComplete(true);
    setScanLine(100);
  }, [uploadedImage, addLogs, saveHistory, tryTrainedMatch, aiEnabled]);

  const handleFile = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setUploadedImage(url);
        setAnalysisComplete(false);
        setDetectedDefects([]);
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) { canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; ctx.drawImage(img, 0, 0); }
          }
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }, [handleFile]);
  const handleImageReset = () => { setUploadedImage(null); setAnalysisComplete(false); setDetectedDefects([]); setIsAnalyzing(false); setScanLine(0); setAnalysisMethod(null); setAiError(null); logRef.current = []; setDetectionLog([]); if (animationRef.current) cancelAnimationFrame(animationRef.current); };

  const loadSample = useCallback(() => {
    const c = document.createElement('canvas'); c.width = 480; c.height = 480;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const gr = ctx.createLinearGradient(0, 0, 480, 480); gr.addColorStop(0, '#6B7280'); gr.addColorStop(0.5, '#78716c'); gr.addColorStop(1, '#4B5563'); ctx.fillStyle = gr; ctx.fillRect(0, 0, 480, 480);
    for (let i = 0; i < 8000; i++) { const x2 = Math.random() * 480, y2 = Math.random() * 480; const b2 = Math.random() * 40 - 20; ctx.fillStyle = 'rgba(' + (128 + b2) + ',' + (128 + b2) + ',' + (128 + b2) + ',0.2)'; ctx.fillRect(x2, y2, 1, 1); }
    ctx.strokeStyle = 'rgba(20,20,20,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(60, 40); ctx.quadraticCurveTo(200, 80, 360, 55); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,30,30,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(80, 100); ctx.lineTo(340, 120); ctx.stroke();
    ctx.strokeStyle = 'rgba(10,10,10,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(300, 160); ctx.lineTo(340, 210); ctx.lineTo(325, 270); ctx.lineTo(360, 320); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(340, 210); ctx.lineTo(380, 200); ctx.stroke();
    ctx.fillStyle = 'rgba(30,25,20,0.55)'; ctx.beginPath(); ctx.ellipse(390, 400, 60, 45, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,15,10,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    const dataUrl = c.toDataURL('image/png');
    setUploadedImage(dataUrl); setAnalysisComplete(false); setDetectedDefects([]);
    const img = new Image();
    img.onload = () => { imageRef.current = img; const mc = canvasRef.current; if (mc) { const mctx = mc.getContext('2d'); if (mctx) { mc.width = img.naturalWidth; mc.height = img.naturalHeight; mctx.drawImage(img, 0, 0); } } };
    img.src = dataUrl;
  }, []);

  // VIDEO
  const handleVideoFile = useCallback((file: File) => {
    if (file && file.type.startsWith('video/')) {
      setVideoSrc(URL.createObjectURL(file)); setVideoPlaying(false); setVideoDefects([]);
      videoDefectsRef.current = []; videoFrameCount.current = 0; logRef.current = []; setDetectionLog([]);
    }
  }, []);

  const videoLoop = useCallback(() => {
    const video = videoPlayerRef.current; const canvas = videoCanvasRef.current;
    if (!video || !canvas || video.paused || video.ended) { setVideoPlaying(false); return; }
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    videoFrameCount.current++;
    if (videoFrameCount.current % 15 === 0) {
      const defects = analyzePixels(ctx, canvas.width, canvas.height);
      videoDefectsRef.current = defects; setVideoDefects([...defects]);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (defects.length > 0) addLogs(defects);
      if (videoFrameCount.current % 60 === 0) saveHistory(defects, 'video', canvas);
    }
    if (videoDefectsRef.current.length > 0) drawBoxes(ctx, videoDefectsRef.current, canvas.width, canvas.height);
    drawHUD(ctx, canvas.width, canvas.height, videoFrameCount.current, fpsTs.current.length, videoDefectsRef.current.length, 'video');
    updateFps(); videoRAFRef.current = requestAnimationFrame(videoLoop);
  }, [updateFps, addLogs, saveHistory]);

  const playVideo = useCallback(() => {
    const v = videoPlayerRef.current; if (!v) return;
    v.play(); setVideoPlaying(true); videoFrameCount.current = 0; videoDefectsRef.current = [];
    fpsTs.current = []; logRef.current = []; setDetectionLog([]);
    videoRAFRef.current = requestAnimationFrame(videoLoop);
  }, [videoLoop]);

  const pauseVideo = useCallback(() => { videoPlayerRef.current?.pause(); setVideoPlaying(false); if (videoRAFRef.current) cancelAnimationFrame(videoRAFRef.current); }, []);
  const resetVideo = useCallback(() => { pauseVideo(); setVideoSrc(null); setVideoDefects([]); videoDefectsRef.current = []; setFps(0); logRef.current = []; setDetectionLog([]); }, [pauseVideo]);

  // WEBCAM
  const webcamLoop = useCallback(() => {
    const video = webcamVideoRef.current; const canvas = webcamCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) { webcamRAFRef.current = requestAnimationFrame(webcamLoop); return; }
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    webcamFrameCount.current++;
    if (webcamFrameCount.current % 12 === 0) {
      const defects = analyzePixels(ctx, canvas.width, canvas.height);
      webcamDefectsRef.current = defects; setWebcamDefects([...defects]);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (defects.length > 0) addLogs(defects);
      if (webcamFrameCount.current % 60 === 0) saveHistory(defects, 'webcam', canvas);
    }
    if (webcamDefectsRef.current.length > 0) drawBoxes(ctx, webcamDefectsRef.current, canvas.width, canvas.height);
    drawHUD(ctx, canvas.width, canvas.height, webcamFrameCount.current, fpsTs.current.length, webcamDefectsRef.current.length, 'webcam');
    updateFps(); webcamRAFRef.current = requestAnimationFrame(webcamLoop);
  }, [updateFps, addLogs, saveHistory]);

  const startWebcam = useCallback(async () => {
    setWebcamError(null); logRef.current = []; setDetectionLog([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) { webcamVideoRef.current.srcObject = stream; await webcamVideoRef.current.play(); }
      setWebcamActive(true); webcamFrameCount.current = 0; webcamDefectsRef.current = []; fpsTs.current = [];
      webcamRAFRef.current = requestAnimationFrame(webcamLoop);
    } catch (err: unknown) {
      const error = err as Error & { name: string };
      setWebcamError(error.name === 'NotAllowedError' ? 'Camera permission denied.' : error.name === 'NotFoundError' ? 'No camera found.' : 'Camera error: ' + error.message);
    }
  }, [webcamLoop]);

  const stopWebcam = useCallback(() => {
    if (webcamRAFRef.current) cancelAnimationFrame(webcamRAFRef.current);
    if (webcamStreamRef.current) { webcamStreamRef.current.getTracks().forEach(t => t.stop()); webcamStreamRef.current = null; }
    if (webcamVideoRef.current) webcamVideoRef.current.srcObject = null;
    setWebcamActive(false); setWebcamDefects([]); webcamDefectsRef.current = []; setFps(0);
  }, []);

  // ESP32-CAM functions
  const esp32FetchFrame = useCallback(async (ip: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timeout = setTimeout(() => { resolve(null); }, 3000);
      img.onload = () => { clearTimeout(timeout); resolve(img); };
      img.onerror = () => { clearTimeout(timeout); resolve(null); };
      img.src = `http://${ip}/capture?t=${Date.now()}`;
    });
  }, []);

  const esp32Loop = useCallback(async () => {
    if (!esp32ActiveRef.current) return;
    const canvas = esp32CanvasRef.current;
    if (!canvas) { if (esp32ActiveRef.current) esp32RAFRef.current = requestAnimationFrame(() => esp32Loop()); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = await esp32FetchFrame(esp32Ip);
    if (!img || !esp32ActiveRef.current) {
      if (esp32ActiveRef.current) esp32RAFRef.current = requestAnimationFrame(() => esp32Loop());
      return;
    }

    canvas.width = img.naturalWidth || 640;
    canvas.height = img.naturalHeight || 480;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    esp32FrameCount.current++;

    if (esp32FrameCount.current % 3 === 0) {
      const defects = analyzePixels(ctx, canvas.width, canvas.height);
      esp32DefectsRef.current = defects;
      setEsp32Defects([...defects]);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (defects.length > 0) addLogs(defects);
      if (esp32FrameCount.current % 30 === 0) saveHistory(defects, 'esp32', canvas);
    }
    if (esp32DefectsRef.current.length > 0) drawBoxes(ctx, esp32DefectsRef.current, canvas.width, canvas.height);
    drawHUD(ctx, canvas.width, canvas.height, esp32FrameCount.current, fpsTs.current.length, esp32DefectsRef.current.length, 'esp32');
    updateFps();
    if (esp32ActiveRef.current) esp32RAFRef.current = requestAnimationFrame(() => esp32Loop());
  }, [esp32Ip, esp32FetchFrame, updateFps, addLogs, saveHistory]);

  const connectEsp32 = useCallback(async () => {
    if (!esp32Ip.trim()) { setEsp32Error('Please enter the ESP32-CAM IP address'); return; }
    setEsp32Connecting(true); setEsp32Error(null);
    logRef.current = []; setDetectionLog([]);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`http://${esp32Ip.trim()}/status`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('Status endpoint returned ' + res.status);
      const data = await res.json();
      if (!data.connected) throw new Error('Camera not ready');
      setEsp32Connected(true);
      esp32ActiveRef.current = true;
      esp32FrameCount.current = 0;
      esp32DefectsRef.current = [];
      fpsTs.current = [];
      esp32RAFRef.current = requestAnimationFrame(() => esp32Loop());
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        setEsp32Error('Connection timed out. Check ESP32-CAM IP and ensure it\'s on the same network.');
      } else {
        setEsp32Error('Cannot connect to ESP32-CAM at ' + esp32Ip.trim() + '. Error: ' + error.message);
      }
    }
    setEsp32Connecting(false);
  }, [esp32Ip, esp32Loop]);

  const disconnectEsp32 = useCallback(() => {
    esp32ActiveRef.current = false;
    if (esp32RAFRef.current) cancelAnimationFrame(esp32RAFRef.current);
    setEsp32Connected(false); setEsp32Defects([]); esp32DefectsRef.current = []; setFps(0);
  }, []);

  const toggleEsp32Flash = useCallback(async () => {
    if (!esp32Ip.trim()) return;
    try {
      await fetch(`http://${esp32Ip.trim()}/flash`);
      setEsp32Flash(prev => !prev);
    } catch { /* ignore */ }
  }, [esp32Ip]);

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); if (videoRAFRef.current) cancelAnimationFrame(videoRAFRef.current); if (webcamRAFRef.current) cancelAnimationFrame(webcamRAFRef.current); if (webcamStreamRef.current) webcamStreamRef.current.getTracks().forEach(t => t.stop()); esp32ActiveRef.current = false; if (esp32RAFRef.current) cancelAnimationFrame(esp32RAFRef.current); }; }, []);
  useEffect(() => { if (mode !== 'webcam') stopWebcam(); if (mode !== 'video') pauseVideo(); if (mode !== 'esp32') disconnectEsp32(); logRef.current = []; setDetectionLog([]); }, [mode, stopWebcam, pauseVideo, disconnectEsp32]);

  const getCurrentDefects = (): DetectedDefect[] => { if (mode === 'image') return detectedDefects; if (mode === 'video') return videoDefects; if (mode === 'esp32') return esp32Defects; return webcamDefects; };
  const isLive = (mode === 'video' && videoPlaying) || (mode === 'webcam' && webcamActive) || (mode === 'esp32' && esp32Connected);
  const currentDefects = getCurrentDefects();
  const hasDefects = currentDefects.length > 0;
  const criticalCount = currentDefects.filter(d => defectClasses[d.type].severity === 'Critical').length;
  const highCount = currentDefects.filter(d => defectClasses[d.type].severity === 'High').length;

  return (
    <section id="demo" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-4">
            <Crosshair className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-amber-600 text-xs font-semibold uppercase tracking-wider">Live Inspector</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Try the <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Inspector</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Upload an image, video, or use your webcam for real-time defect detection.
          </p>
        </div>

        {modelTrained && (
          <div className="max-w-3xl mx-auto mb-6 p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-green-400 text-sm font-medium">Trained model active ({trainedImages.length} image fingerprints loaded) - trained images will be recognized automatically</span>
          </div>
        )}

        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-300 text-sm font-medium mb-1">Detection Modes</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                <strong className="text-gray-900">Trained model:</strong> If you trained on an image, uploading the same image will match its fingerprint and show your annotations as defects.{' '}
                <strong className="text-gray-900">Pixel analysis:</strong> For untrained images, analyzes brightness, variance, edges, and texture to find real anomalies. Images are saved to History with thumbnails.
              </p>
            </div>
          </div>
        </div>

        <AISettingsPanel onStatusChange={(enabled) => setAiEnabled(enabled)} />

        <div className="flex justify-center mb-8">
          <div className="inline-flex flex-wrap justify-center bg-white border border-gray-200 rounded-xl p-1 gap-1">
            {([
              { id: 'image' as InputMode, label: 'Image', icon: ImageIcon },
              { id: 'video' as InputMode, label: 'Video', icon: Video },
              { id: 'webcam' as InputMode, label: 'Webcam', icon: Camera },
              { id: 'esp32' as InputMode, label: 'ESP32-CAM', icon: CircuitBoard },
            ]).map((tab) => (
              <button key={tab.id} onClick={() => setMode(tab.id)}
                className={cn('flex items-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300',
                  mode === tab.id ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-gray-900 shadow-lg shadow-amber-500/15' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50')}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 max-w-7xl mx-auto">
          <div className="lg:col-span-3 space-y-4">
            {mode === 'image' && (
              <>
                {!uploadedImage ? (
                  <div onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                    className={cn('relative flex flex-col items-center justify-center h-96 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300', dragActive ? 'border-cyan-400 bg-amber-50' : 'border-gray-200 bg-gray-50 hover:border-gray-500 hover:bg-white')}>
                    <Upload className="w-12 h-12 text-gray-400 mb-4" /><p className="text-gray-400 font-medium mb-2">Drop an image here or click to upload</p><p className="text-gray-400 text-sm">Supports JPG, PNG, BMP, WebP</p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                    {isAnalyzing && (<div className="absolute inset-0 z-20 pointer-events-none"><div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-lg shadow-cyan-400/50" style={{ top: scanLine + '%', transition: 'top 0.05s linear' }} /><div className="absolute left-0 right-0 bg-gradient-to-b from-cyan-400/10 to-transparent" style={{ top: 0, height: scanLine + '%' }} /></div>)}
                    <canvas ref={canvasRef} className="w-full h-auto max-h-[350px] sm:max-h-[500px] object-contain" />
                    <div className="absolute top-3 left-3 z-30">
                      {isAnalyzing && (<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm"><div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /><span className="text-yellow-400 text-xs font-bold">ANALYZING...</span></div>)}
                      {analysisComplete && (<div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm', hasDefects ? 'bg-red-500/20 border-red-500/30' : 'bg-green-500/20 border-green-500/30')}>{hasDefects ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}<span className={cn('text-xs font-bold', hasDefects ? 'text-red-400' : 'text-green-400')}>{hasDefects ? currentDefects.length + ' DEFECT' + (currentDefects.length > 1 ? 'S' : '') + ' DETECTED' : 'PASS - NO DEFECTS'}</span></div>)}
                      {analysisComplete && analysisMethod && (
                        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-sm mt-2', analysisMethod === 'ai' ? 'bg-violet-500/20 border-violet-500/30' : 'bg-blue-500/20 border-blue-500/30')}>
                          {analysisMethod === 'ai' ? <Sparkles className="w-3 h-3 text-violet-400" /> : <Cpu className="w-3 h-3 text-blue-400" />}
                          <span className={cn('text-[10px] font-bold', analysisMethod === 'ai' ? 'text-violet-400' : 'text-blue-400')}>
                            {analysisMethod === 'ai' ? 'GEMINI AI' : 'PIXEL ANALYSIS'}
                          </span>
                        </div>
                      )}
                      {aiError && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm mt-2">
                          <AlertTriangle className="w-3 h-3 text-yellow-400" />
                          <span className="text-[10px] font-bold text-yellow-400">AI fallback: {aiError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  {!uploadedImage && (<button onClick={loadSample} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-900 font-medium hover:bg-gray-100 transition-all"><ImageIcon className="w-4 h-4" /> Load Sample</button>)}
                  {uploadedImage && !isAnalyzing && !analysisComplete && (<button onClick={handleAnalyze} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-gray-900 font-semibold shadow-lg shadow-amber-500/15 hover:shadow-amber-500/25 transition-all hover:scale-[1.02]"><Play className="w-4 h-4" /> Run Inspection</button>)}
                  {uploadedImage && (<button onClick={handleImageReset} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-medium hover:bg-gray-100 hover:text-gray-900 transition-all"><RotateCcw className="w-4 h-4" /> Reset</button>)}
                </div>
              </>
            )}
            {mode === 'video' && (
              <>
                {!videoSrc ? (
                  <div onClick={() => videoFileInputRef.current?.click()} className="relative flex flex-col items-center justify-center h-96 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-gray-500 hover:bg-white cursor-pointer transition-all duration-300">
                    <Video className="w-12 h-12 text-gray-400 mb-4" /><p className="text-gray-400 font-medium mb-2">Click to upload a video file</p><p className="text-gray-400 text-sm">Supports MP4, WebM, AVI, MOV</p>
                    <input ref={videoFileInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); }} />
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white">
                    <video ref={videoPlayerRef} src={videoSrc} className="hidden" muted playsInline onEnded={() => { setVideoPlaying(false); if (videoRAFRef.current) cancelAnimationFrame(videoRAFRef.current); }} />
                    <canvas ref={videoCanvasRef} className="w-full h-auto max-h-[350px] sm:max-h-[500px] object-contain" />
                    {!videoPlaying && (<div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20"><div className="text-center"><div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-2 border-cyan-500/40 flex items-center justify-center mx-auto mb-3 cursor-pointer hover:scale-110 transition-all" onClick={playVideo}><Play className="w-10 h-10 text-amber-600 ml-1" /></div><p className="text-gray-300 text-sm font-medium">Click to start analysis</p></div></div>)}
                  </div>
                )}
                <div className="flex gap-3">
                  {videoSrc && !videoPlaying && (<button onClick={playVideo} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-gray-900 font-semibold shadow-lg shadow-amber-500/15 transition-all hover:scale-[1.02]"><Play className="w-4 h-4" /> Play</button>)}
                  {videoSrc && videoPlaying && (<button onClick={pauseVideo} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-semibold transition-all hover:bg-yellow-500/30"><Pause className="w-4 h-4" /> Pause</button>)}
                  {videoSrc && (<button onClick={resetVideo} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-medium hover:bg-gray-100 hover:text-gray-900 transition-all"><RotateCcw className="w-4 h-4" /> Reset</button>)}
                </div>
              </>
            )}
            {mode === 'webcam' && (
              <>
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white min-h-[380px]">
                  <video ref={webcamVideoRef} className="hidden" playsInline muted autoPlay />
                  <canvas ref={webcamCanvasRef} className={cn("w-full h-auto max-h-[500px] object-contain", !webcamActive && "hidden")} />
                  {!webcamActive && (<div className="absolute inset-0 flex items-center justify-center"><div className="text-center">{webcamError ? (<><XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" /><p className="text-red-400 font-medium mb-2 max-w-xs">{webcamError}</p><button onClick={startWebcam} className="mt-4 px-5 py-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-600 text-sm font-semibold hover:bg-cyan-500/30 transition-all">Try Again</button></>) : (<><div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4"><Camera className="w-12 h-12 text-amber-600 animate-pulse" /></div><p className="text-gray-300 font-medium mb-2">Start Webcam</p><p className="text-gray-400 text-sm mb-1">Camera access required</p></>)}</div></div>)}
                  {webcamActive && (<div className="absolute top-12 right-3 z-30"><div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-sm"><Circle className="w-3 h-3 text-green-400 fill-green-400 animate-pulse" /><span className="text-green-400 text-xs font-bold">LIVE</span></div></div>)}
                </div>
                <div className="flex gap-3">
                  {!webcamActive ? (<button onClick={startWebcam} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-gray-900 font-semibold shadow-lg shadow-amber-500/15 transition-all hover:scale-[1.02]"><Camera className="w-4 h-4" /> Start Webcam</button>) : (<button onClick={stopWebcam} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold transition-all hover:bg-red-500/30"><Square className="w-4 h-4" /> Stop</button>)}
                </div>
              </>
            )}
            {mode === 'esp32' && (
              <>
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white min-h-[380px]">
                  <canvas ref={esp32CanvasRef} className={cn("w-full h-auto max-h-[500px] object-contain", !esp32Connected && "hidden")} />
                  {!esp32Connected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center px-6 w-full max-w-md">
                        {esp32Error ? (
                          <>
                            <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
                            <p className="text-red-400 font-medium mb-4 max-w-xs mx-auto text-sm">{esp32Error}</p>
                          </>
                        ) : (
                          <>
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-2 border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                              <CircuitBoard className={cn("w-12 h-12 text-emerald-400", esp32Connecting && "animate-pulse")} />
                            </div>
                            <p className="text-gray-300 font-medium mb-1">Connect ESP32-CAM</p>
                            <p className="text-gray-400 text-xs mb-4">Enter the IP address shown in Arduino Serial Monitor</p>
                          </>
                        )}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={esp32Ip}
                              onChange={(e) => setEsp32Ip(e.target.value)}
                              placeholder="192.168.1.100"
                              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                              onKeyDown={(e) => { if (e.key === 'Enter') connectEsp32(); }}
                            />
                          </div>
                          <button
                            onClick={connectEsp32}
                            disabled={esp32Connecting}
                            className={cn("px-4 py-2.5 rounded-lg font-semibold text-sm transition-all", esp32Connecting ? "bg-gray-700 text-gray-400 cursor-wait" : "bg-gradient-to-r from-emerald-500 to-cyan-600 text-gray-900 hover:shadow-lg hover:shadow-emerald-500/25")}
                          >
                            {esp32Connecting ? 'Connecting...' : 'Connect'}
                          </button>
                        </div>
                        <div className="mt-4 p-3 rounded-lg bg-white border border-gray-200 text-left">
                          <p className="text-gray-400 text-[11px] leading-relaxed">
                            <span className="text-emerald-400 font-semibold">Setup:</span> Upload the ESP32-CAM firmware via Arduino IDE â†’ Open Serial Monitor at 115200 baud â†’ Copy the IP address shown â†’ Paste it above
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {esp32Connected && (
                    <div className="absolute top-12 right-3 z-30 flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm">
                        <CircuitBoard className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-bold">ESP32</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  {!esp32Connected ? (
                    <button onClick={connectEsp32} disabled={esp32Connecting} className={cn("flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all", esp32Connecting ? "bg-gray-700 text-gray-400 cursor-wait" : "bg-gradient-to-r from-emerald-500 to-cyan-600 text-gray-900 shadow-lg shadow-emerald-500/25 hover:scale-[1.02]")}>
                      <CircuitBoard className="w-4 h-4" /> {esp32Connecting ? 'Connecting...' : 'Connect ESP32-CAM'}
                    </button>
                  ) : (
                    <>
                      <button onClick={toggleEsp32Flash} className={cn("flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-semibold transition-all", esp32Flash ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-400" : "bg-white/5 border-white/10 text-gray-400 hover:bg-gray-100 hover:text-gray-900")}>
                        <Zap className="w-4 h-4" /> Flash {esp32Flash ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={disconnectEsp32} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold transition-all hover:bg-red-500/30">
                        <Square className="w-4 h-4" /> Disconnect
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4 overflow-hidden">
            {isLive && (<div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-amber-200 flex items-center gap-3"><div className="relative"><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400/50 animate-ping" /></div><div className="flex-1"><span className="text-gray-900 font-bold text-sm">Live Analysis</span><p className="text-gray-400 text-xs">{fps} FPS</p></div><div className="px-2 py-1 rounded bg-amber-100 border border-amber-300"><span className="text-amber-600 text-xs font-mono font-bold">{fps} FPS</span></div></div>)}

            <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><Crosshair className="w-5 h-5 text-amber-600" /><h3 className="text-lg font-bold text-gray-900">Report</h3>{isLive && <span className="ml-auto px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold">LIVE</span>}</div>
              {currentDefects.length === 0 && !analysisComplete && !isLive ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Crosshair className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm text-center">{isAnalyzing ? 'Scanning...' : 'Upload and analyze'}</p>
                  {isAnalyzing && <div className="mt-4 w-48 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-100" style={{ width: scanLine + '%' }} /></div>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={cn('p-3 rounded-xl border', hasDefects ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20')}>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Verdict</span>
                      {hasDefects ? (<span className="flex items-center gap-2">{criticalCount > 0 && <AlertTriangle className="w-4 h-4 text-red-400" />}<span className={cn('text-sm font-black', criticalCount > 0 ? 'text-red-400' : 'text-orange-400')}>{criticalCount > 0 ? 'CRITICAL' : 'DEFECT DETECTED'}</span></span>) : (<span className="text-green-400 text-sm font-black">PASS</span>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-white border border-gray-200 text-center"><div className="text-gray-400 text-[10px] mb-0.5">Total</div><div className="text-gray-900 font-bold text-lg">{currentDefects.length}</div></div>
                    <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-center"><div className="text-gray-400 text-[10px] mb-0.5">Critical</div><div className="text-red-400 font-bold text-lg">{criticalCount}</div></div>
                    <div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/10 text-center"><div className="text-gray-400 text-[10px] mb-0.5">High</div><div className="text-orange-400 font-bold text-lg">{highCount}</div></div>
                  </div>
                  {hasDefects && (<div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">{currentDefects.map(d => (<div key={d.id} className="p-2.5 rounded-lg border bg-gray-50 border-gray-200"><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: defectClasses[d.type].color }} /><span className="text-gray-900 font-medium text-sm">{defectClasses[d.type].name}</span><span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-bold', defectClasses[d.type].severity === 'Critical' ? 'bg-red-600/20 text-red-400 border-red-500/30' : defectClasses[d.type].severity === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30')}>{defectClasses[d.type].severity}</span></div><span className="text-amber-600 font-mono font-bold text-sm">{(d.confidence * 100).toFixed(1)}%</span></div>{d.shape && (<div className="ml-5 flex flex-wrap gap-1 mt-1"><span className={cn('text-[9px] px-1.5 py-0.5 rounded font-medium border', d.shape.dimension === '3D-depth' ? 'bg-purple-500/15 border-purple-500/25 text-purple-400' : 'bg-blue-500/15 border-blue-500/25 text-blue-400')}>{d.shape.dimension}</span><span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-400">{d.shape.contourType}</span></div>)}</div>))}</div>)}
                  {!hasDefects && isLive && (<div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/10"><CheckCircle className="w-5 h-5 text-green-400" /><div><p className="text-green-400 text-sm font-semibold">Clean</p><p className="text-gray-400 text-xs">No anomalies</p></div></div>)}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200"><div className="flex items-center gap-1.5 mb-1"><Clock className="w-3 h-3 text-gray-400" /><span className="text-gray-400 text-xs">Latency</span></div><div className="text-gray-900 font-mono font-bold text-sm">{isLive ? Math.max(8, Math.round(1000 / Math.max(1, fps))) + 'ms' : analysisComplete ? '32ms' : '-'}</div></div>
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200"><div className="flex items-center gap-1.5 mb-1"><Layers className="w-3 h-3 text-gray-400" /><span className="text-gray-400 text-xs">Mode</span></div><div className="text-gray-900 font-mono font-bold text-sm">{modelTrained ? 'Trained' : 'Pixel'}</div></div>
                  </div>
                </div>
              )}
            </div>

            {(isLive || detectionLog.length > 0) && (
              <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">{isLive && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}<Activity className="w-3.5 h-3.5 text-amber-600" /> Log<span className="ml-auto text-gray-400 text-xs font-normal">{detectionLog.length}</span></h4>
                <div className="space-y-1 font-mono text-xs max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {detectionLog.length === 0 ? (<p className="text-gray-400 text-center py-4">{isLive ? 'Surface clean' : 'Waiting...'}</p>) : (detectionLog.map((entry, i) => (<div key={i} className="flex items-center justify-between text-gray-400 py-0.5"><span><span className="text-gray-400">[{entry.timestamp}]</span>{' '}<span style={{ color: defectClasses[entry.type].color }}>{defectClasses[entry.type].name}</span></span><span className="text-amber-600">{(entry.confidence * 100).toFixed(1)}%</span></div>)))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
