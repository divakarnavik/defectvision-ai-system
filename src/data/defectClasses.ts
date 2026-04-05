import { DefectType } from '../types';

export const defectClasses: Record<DefectType, { name: string; description: string; color: string; severity: string }> = {
  crack: {
    name: 'Crack',
    description: 'Visible fracture lines that penetrate into the material surface. Caused by stress concentration, fatigue, thermal shock, or material brittleness. Critical structural defect.',
    color: '#DC2626',
    severity: 'Critical',
  },
  damage: {
    name: 'Damage',
    description: 'General surface damage including dents, gouges, abrasions, and impact marks from mechanical force, mishandling, or collision during manufacturing or transport.',
    color: '#F97316',
    severity: 'High',
  },
  broken: {
    name: 'Broken',
    description: 'Structural fracture or breakage where material integrity is fully compromised. Includes chipped edges, shattered sections, and complete material failure.',
    color: '#B91C1C',
    severity: 'Critical',
  },
  scratches: {
    name: 'Scratches',
    description: 'Linear marks on the surface caused by mechanical contact, tool marks, abrasion, or improper handling during transportation, assembly, or processing.',
    color: '#10B981',
    severity: 'Low',
  },
};
