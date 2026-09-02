// @ts-nocheck
import React from 'react';

interface CustomTimePickerProps {
  value: string;
  onChange: (val: string) => void;
}

export function CustomTimePicker({ value, onChange }: CustomTimePickerProps) {
  return (
    <input
      type="time"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-surface-elevated text-text-primary text-sm border border-surface-border rounded-xl px-3 py-2 outline-none focus:border-accent-blue transition-all [color-scheme:dark] cursor-pointer"
    />
  );
}

interface CustomDateTimePickerProps {
  value: string;
  onChange: (val: string) => void;
}

export function CustomDateTimePicker({ value, onChange }: CustomDateTimePickerProps) {
  return (
    <input
      type="datetime-local"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-surface-elevated text-text-primary text-sm border border-surface-border rounded-xl px-3 py-2 outline-none focus:border-accent-blue transition-all [color-scheme:dark] cursor-pointer"
    />
  );
}