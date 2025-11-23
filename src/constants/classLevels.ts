// ──────────────────────────────────────────────────────────────────────────────
//  src/constants/classLevels.ts
// ──────────────────────────────────────────────────────────────────────────────

/**
 * ClassLevel interface for class level data
 */
export interface ClassLevel {
  /** Unique identifier for picker/selection */
  value: string;
  /** Display name for UI (Turkish) */
  label: string;
  /** Slug identifier */
  id: string;
  /** English name */
  en: string;
  /** Sort order (lower = first) */
  order: number | null;
  /** Whether user can select this option */
  selectable: boolean;
}

/* -------------------------------------------------------------------------- */
/*  1. Main Class Levels Data Array                                          */
/* -------------------------------------------------------------------------- */
export const CLASS_LEVELS_DATA: ClassLevel[] = [
  { value: 'prep', label: 'Hazırlık', id: 'prep', en: 'Preparatory', order: 0, selectable: true },
  { value: '1', label: '1. Sınıf', id: '1', en: '1st Year', order: 1, selectable: true },
  { value: '2', label: '2. Sınıf', id: '2', en: '2nd Year', order: 2, selectable: true },
  { value: '3', label: '3. Sınıf', id: '3', en: '3rd Year', order: 3, selectable: true },
  { value: '4', label: '4. Sınıf', id: '4', en: '4th Year', order: 4, selectable: true },
  { value: '5', label: '5. Sınıf', id: '5', en: '5th Year', order: 5, selectable: true },
  { value: '6', label: '6. Sınıf', id: '6', en: '6th Year', order: 6, selectable: true },
  { value: 'ms', label: 'Yüksek Lisans', id: 'ms', en: 'Master\'s', order: 7, selectable: true },
  { value: 'phd', label: 'Doktora', id: 'phd', en: 'PhD', order: 8, selectable: true },
  { value: 'grad', label: 'Mezun', id: 'grad', en: 'Graduate', order: 9, selectable: true }
];

/* -------------------------------------------------------------------------- */
/*  2. Helper Functions                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Get all class levels formatted for pickers/selectors
 * @param withPlaceholder - Add placeholder option at the top
 * @returns Array of class level options
 */
export const getClassLevelOptions = (withPlaceholder: boolean = false): ClassLevel[] => {
  const options = CLASS_LEVELS_DATA
    .filter(level => level.selectable)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (withPlaceholder) {
    const placeholder: ClassLevel = { 
      value: '', 
      label: 'Sınıf Seçiniz...', 
      id: '', 
      en: '', 
      order: -1,
      selectable: true
    };
    return [placeholder, ...options];
  }

  return options;
};

/**
 * Get class level by ID
 * @param id - Class level ID
 * @returns Class level object or null
 */
export const getClassLevelById = (id: string): ClassLevel | null => {
  return CLASS_LEVELS_DATA.find(level => level.id === id) || null;
};

/**
 * Get class level by value
 * @param value - Class level value
 * @returns Class level object or null
 */
export const getClassLevelByValue = (value: string | number): ClassLevel | null => {
  return CLASS_LEVELS_DATA.find(level => level.value === value?.toString()) || null;
};

/**
 * Get undergraduate class levels only (1-6)
 * @returns Array of undergraduate class levels
 */
export const getUndergraduateLevels = (): ClassLevel[] => {
  return CLASS_LEVELS_DATA.filter(level => 
    ['prep', '1', '2', '3', '4', '5', '6'].includes(level.value)
  );
};

/**
 * Get graduate class levels only (MS, PhD)
 * @returns Array of graduate class levels
 */
export const getGraduateLevels = (): ClassLevel[] => {
  return CLASS_LEVELS_DATA.filter(level => 
    ['ms', 'phd'].includes(level.value)
  );
};

/**
 * Check if a class level is undergraduate
 * @param value - Class level value
 * @returns True if undergraduate level
 */
export const isUndergraduate = (value: string | number | undefined): boolean => {
  return value !== undefined && ['prep', '1', '2', '3', '4', '5', '6'].includes(value.toString());
};

/**
 * Check if a class level is graduate
 * @param value - Class level value
 * @returns True if graduate level
 */
export const isGraduate = (value: string | number | undefined): boolean => {
  return value !== undefined && ['ms', 'phd'].includes(value.toString());
};

/* -------------------------------------------------------------------------- */
/*  3. Default Export (backwards compatibility)                              */
/* -------------------------------------------------------------------------- */
export default CLASS_LEVELS_DATA;
