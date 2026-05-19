'use client';

import { Input } from '@/components/ui/input';
import { isLoggedSetReps } from '@/lib/validation';
import { useState } from 'react';

const KG_INPUT_RE = /^\d*\.?\d{0,2}$/;
/** At most one decimal digit (half reps: 6, 6.5, 10.5). */
const REPS_INPUT_RE = /^\d*\.?\d?$/;

type ActiveWorkoutSetNumericInputProps = {
  id: string;
  field: 'kg' | 'reps';
  value: number | null;
  onChange: (value: number | '') => void;
  onBlur: () => void;
  className?: string;
};

function parseKgInput(raw: string): number | '' | null {
  if (raw === '') {
    return '';
  }
  if (!KG_INPUT_RE.test(raw) || raw.endsWith('.')) {
    return null;
  }
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseRepsInput(raw: string): number | '' | null {
  if (raw === '') {
    return '';
  }
  if (!REPS_INPUT_RE.test(raw) || raw.endsWith('.') || raw === '.') {
    return null;
  }
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) {
    return null;
  }
  const halfStep = Math.round(n * 2) / 2;
  return isLoggedSetReps(halfStep) ? halfStep : null;
}

function allowsTyping(field: 'kg' | 'reps', raw: string): boolean {
  if (raw === '') {
    return true;
  }
  return field === 'kg' ? KG_INPUT_RE.test(raw) : REPS_INPUT_RE.test(raw);
}

export function ActiveWorkoutSetNumericInput({
  id,
  field,
  value,
  onChange,
  onBlur,
  className,
}: ActiveWorkoutSetNumericInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const display = isEditing ? draft : (value ?? '');
  const parse = field === 'kg' ? parseKgInput : parseRepsInput;

  const commitRaw = (raw: string) => {
    const parsed = parse(raw);
    if (parsed === null) {
      return;
    }
    onChange(parsed);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      placeholder="0"
      value={display}
      onFocus={() => {
        setIsEditing(true);
        setDraft(value !== null && value !== undefined ? String(value) : '');
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (!allowsTyping(field, raw)) {
          return;
        }
        setDraft(raw);
        if (raw === '') {
          onChange('');
          return;
        }
        const parsed = parse(raw);
        if (parsed !== null) {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        if (isEditing) {
          commitRaw(draft);
          setIsEditing(false);
        }
        onBlur();
      }}
      className={className}
    />
  );
}
